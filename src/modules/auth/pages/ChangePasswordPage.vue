<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import PasswordField from '@/shared/components/PasswordField.vue'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { fillOtpDigitsFromInput, mergeOtpDigits, normalizeOtpDigit, normalizePhoneCandidate, normalizePhoneInput } from '@/modules/auth/phoneVerification'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { strings } = storeToRefs(settingsStore)
const { isSubmitting } = storeToRefs(authStore)

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
  identifier: '',
})
const otpDigits = ref(['', '', '', '', ''])
const otpRefs = ref<Array<HTMLInputElement | null>>([])
const errorMessage = ref('')
const infoMessage = ref('')
const requestSubmitting = ref(false)
const verifySubmitting = ref(false)
const resendSubmitting = ref(false)
const resetToken = ref('')
const requestedIdentifier = ref('')
const maskedPhoneNumber = ref<string | null>(null)
const countdownSeconds = ref(0)
const invitedInitialized = ref(false)
const invitedRequiresPhoneVerification = ref(false)
const invitedPhoneVerified = ref(false)
let countdownTimer: number | null = null

const isForgotPasswordMode = computed(() => route.meta.authMode === 'forgot-password')
const isInvitedAccountMode = computed(() => route.meta.authMode === 'invited-account')
const invitedToken = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const isIdentifierStep = computed(() => isForgotPasswordMode.value && !requestedIdentifier.value)
const isCodeStep = computed(
  () =>
    (isForgotPasswordMode.value && Boolean(requestedIdentifier.value) && !resetToken.value) ||
    (isInvitedAccountMode.value && invitedInitialized.value && invitedRequiresPhoneVerification.value && !invitedPhoneVerified.value),
)
const isResetStep = computed(
  () =>
    (isForgotPasswordMode.value && Boolean(resetToken.value)) ||
    (isInvitedAccountMode.value && invitedInitialized.value && (!invitedRequiresPhoneVerification.value || invitedPhoneVerified.value)),
)

const heroTitle = computed(() => {
  if (!isForgotPasswordMode.value && !isInvitedAccountMode.value) return strings.value.changePasswordTitle
  if (isInvitedAccountMode.value) {
    if (isCodeStep.value) return strings.value.invitedAccountCodeTitle
    if (isResetStep.value) return strings.value.invitedAccountResetTitle
    return strings.value.invitedAccountTitle
  }
  if (isIdentifierStep.value) return strings.value.forgotPasswordTitle
  if (isCodeStep.value) return strings.value.forgotPasswordCodeTitle
  return strings.value.forgotPasswordResetTitle
})

const heroSubtitle = computed(() => {
  if (!isForgotPasswordMode.value && !isInvitedAccountMode.value) return strings.value.changePasswordSubtitle
  if (isInvitedAccountMode.value) {
    if (isCodeStep.value) {
      return maskedPhoneNumber.value ? `${strings.value.invitedAccountCodeSubtitle} ${maskedPhoneNumber.value}` : strings.value.invitedAccountCodeSubtitle
    }
    if (isResetStep.value) return strings.value.invitedAccountResetSubtitle
    return strings.value.invitedAccountSubtitle
  }
  if (isIdentifierStep.value) return strings.value.forgotPasswordSubtitle
  if (isCodeStep.value) {
    return maskedPhoneNumber.value ? `${strings.value.forgotPasswordCodeSubtitle} ${maskedPhoneNumber.value}` : strings.value.forgotPasswordCodeSubtitle
  }
  return strings.value.forgotPasswordResetSubtitle
})

const loadingLabel = computed(() => {
  if (!isForgotPasswordMode.value && !isInvitedAccountMode.value) return strings.value.changePasswordLoading
  if (isInvitedAccountMode.value) {
    if (!invitedInitialized.value) return strings.value.invitedAccountPreparingLoading
    if (isCodeStep.value) return strings.value.forgotPasswordVerifyLoading
    if (isResetStep.value) return strings.value.forgotPasswordConfirmLoading
    return strings.value.invitedAccountPreparingLoading
  }
  if (isIdentifierStep.value) return strings.value.forgotPasswordRequestLoading
  if (isCodeStep.value) return strings.value.forgotPasswordVerifyLoading
  return strings.value.forgotPasswordConfirmLoading
})

const otpValue = computed(() => mergeOtpDigits(otpDigits.value))
const canSubmitResetCode = computed(() => otpValue.value.length === otpDigits.value.length && !verifySubmitting.value)
const canResendCode = computed(() => countdownSeconds.value <= 0 && !resendSubmitting.value && !requestSubmitting.value)

watch(
  () => route.fullPath,
  () => {
    errorMessage.value = ''
    infoMessage.value = ''
    if (!isForgotPasswordMode.value && !isInvitedAccountMode.value) return
    form.identifier = ''
    form.newPassword = ''
    form.confirmNewPassword = ''
    requestedIdentifier.value = ''
    resetToken.value = ''
    maskedPhoneNumber.value = null
    invitedInitialized.value = false
    invitedRequiresPhoneVerification.value = false
    invitedPhoneVerified.value = false
    otpDigits.value = ['', '', '', '', '']
    stopCountdown()
  },
)

watch(
  () => [isInvitedAccountMode.value, invitedToken.value] as const,
  async ([activeMode, token]) => {
    if (!activeMode) return
    errorMessage.value = ''
    infoMessage.value = ''
    maskedPhoneNumber.value = null
    otpDigits.value = ['', '', '', '', '']
    resetToken.value = ''
    invitedInitialized.value = false
    invitedRequiresPhoneVerification.value = false
    invitedPhoneVerified.value = false
    stopCountdown()

    if (!token) {
      errorMessage.value = strings.value.invitedAccountTokenInvalid
      return
    }

    requestSubmitting.value = true
    try {
      const response = await authStore.requestInvitedAccount({ token })
      invitedInitialized.value = true
      invitedRequiresPhoneVerification.value = false
      invitedPhoneVerified.value = true
      maskedPhoneNumber.value = response.masked_phone_number
    } catch (error) {
      errorMessage.value = resolveInvitedAccountError(error)
    } finally {
      requestSubmitting.value = false
    }
  },
  { immediate: true },
)

function stopCountdown() {
  if (countdownTimer !== null) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startCountdown(seconds: number) {
  stopCountdown()
  countdownSeconds.value = Math.max(0, seconds)
  if (countdownSeconds.value <= 0) return
  countdownTimer = window.setInterval(() => {
    if (countdownSeconds.value <= 1) {
      countdownSeconds.value = 0
      stopCountdown()
      return
    }
    countdownSeconds.value -= 1
  }, 1000)
}

function setOtpRef(index: number, element: Element | null) {
  otpRefs.value[index] = element instanceof HTMLInputElement ? element : null
}

function focusOtp(index: number) {
  otpRefs.value[index]?.focus()
  otpRefs.value[index]?.select()
}

function onOtpInput(index: number, value: string) {
  const normalized = normalizeOtpDigit(value)
  otpDigits.value[index] = normalized
  if (normalized && index < otpDigits.value.length - 1) {
    focusOtp(index + 1)
  }
}

function onOtpKeydown(index: number, event: KeyboardEvent) {
  if (event.key !== 'Backspace') return
  if (otpDigits.value[index]) {
    otpDigits.value[index] = ''
    event.preventDefault()
    return
  }
  if (index > 0) {
    event.preventDefault()
    focusOtp(index - 1)
  }
}

function onOtpPaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData('text') ?? ''
  const digits = fillOtpDigitsFromInput(pasted, otpDigits.value.length)
  if (digits.every((digit) => !digit)) return
  event.preventDefault()
  otpDigits.value = digits
  focusOtp(digits.reduce((last, digit, index) => (digit ? index : last), 0))
}

async function submit() {
  errorMessage.value = ''
  infoMessage.value = ''

  if (!isForgotPasswordMode.value && !isInvitedAccountMode.value) {
    await submitChangePassword()
    return
  }
  if (isInvitedAccountMode.value) {
    if (isCodeStep.value) {
      await submitInvitedAccountVerify()
      return
    }
    if (isResetStep.value) {
      await submitInvitedAccountComplete()
    }
    return
  }
  if (isIdentifierStep.value) {
    await submitForgotPasswordRequest()
    return
  }
  if (isCodeStep.value) {
    await submitForgotPasswordVerify()
    return
  }
  await submitForgotPasswordConfirm()
}

async function submitChangePassword() {
  if (!form.currentPassword) {
    errorMessage.value = strings.value.currentPasswordRequired
    return
  }
  if (!form.newPassword) {
    errorMessage.value = strings.value.passwordRequired
    return
  }
  if (form.newPassword.length < 8) {
    errorMessage.value = strings.value.passwordTooShort
    return
  }

  try {
    await authStore.changePassword({
      current_password: form.currentPassword,
      new_password: form.newPassword,
    })
    router.replace('/groups')
  } catch (error) {
    errorMessage.value = resolveChangePasswordError(error)
  }
}

async function submitForgotPasswordRequest() {
  if (!form.identifier.trim()) {
    errorMessage.value = strings.value.forgotPasswordIdentifierRequired
    return
  }

  requestSubmitting.value = true
  try {
    const response = await authStore.requestPasswordReset({
      identifier: normalizePhoneCandidate(form.identifier.trim()),
    })
    requestedIdentifier.value = form.identifier.trim()
    maskedPhoneNumber.value = response.masked_phone_number
    infoMessage.value = strings.value.phoneVerificationCodeSent
    otpDigits.value = ['', '', '', '', '']
    startCountdown(response.resend_available_in_seconds)
    await nextTick()
    focusOtp(0)
  } catch (error) {
    errorMessage.value = resolveForgotPasswordError(error)
  } finally {
    requestSubmitting.value = false
  }
}

async function submitForgotPasswordVerify() {
  if (otpValue.value.length !== otpDigits.value.length) {
    errorMessage.value = strings.value.forgotPasswordCodeInvalid
    return
  }

  verifySubmitting.value = true
  try {
    const response = await authStore.verifyPasswordResetCode({
      identifier: requestedIdentifier.value,
      code: otpValue.value,
    })
    resetToken.value = response.reset_token
    form.newPassword = ''
    form.confirmNewPassword = ''
  } catch (error) {
    errorMessage.value = resolveForgotPasswordError(error)
  } finally {
    verifySubmitting.value = false
  }
}

async function submitForgotPasswordConfirm() {
  if (!form.newPassword) {
    errorMessage.value = strings.value.passwordRequired
    return
  }
  if (form.newPassword.length < 8) {
    errorMessage.value = strings.value.passwordTooShort
    return
  }
  if (!form.confirmNewPassword) {
    errorMessage.value = strings.value.passwordRequired
    return
  }
  if (form.newPassword !== form.confirmNewPassword) {
    errorMessage.value = strings.value.forgotPasswordPasswordMismatch
    return
  }

  try {
    await authStore.confirmPasswordReset({
      reset_token: resetToken.value,
      new_password: form.newPassword,
    })
    router.replace('/groups')
  } catch (error) {
    errorMessage.value = resolveForgotPasswordError(error)
  }
}

async function submitInvitedAccountVerify() {
  if (otpValue.value.length !== otpDigits.value.length) {
    errorMessage.value = strings.value.forgotPasswordCodeInvalid
    return
  }

  verifySubmitting.value = true
  try {
    await authStore.verifyInvitedAccountPhone({
      token: invitedToken.value,
      code: otpValue.value,
    })
    invitedPhoneVerified.value = true
    otpDigits.value = ['', '', '', '', '']
  } catch (error) {
    errorMessage.value = resolveInvitedAccountError(error)
  } finally {
    verifySubmitting.value = false
  }
}

async function submitInvitedAccountComplete() {
  if (!form.newPassword) {
    errorMessage.value = strings.value.passwordRequired
    return
  }
  if (form.newPassword.length < 8) {
    errorMessage.value = strings.value.passwordTooShort
    return
  }
  if (!form.confirmNewPassword) {
    errorMessage.value = strings.value.passwordRequired
    return
  }
  if (form.newPassword !== form.confirmNewPassword) {
    errorMessage.value = strings.value.forgotPasswordPasswordMismatch
    return
  }

  try {
    await authStore.completeInvitedAccount({
      token: invitedToken.value,
      new_password: form.newPassword,
    })
    router.replace('/groups')
  } catch (error) {
    errorMessage.value = resolveInvitedAccountError(error)
  }
}

async function resendCode() {
  if (!canResendCode.value) return
  requestSubmitting.value = true
  errorMessage.value = ''
  try {
    const response = isInvitedAccountMode.value
      ? await authStore.requestInvitedAccount({ token: invitedToken.value })
      : await authStore.requestPasswordReset({ identifier: requestedIdentifier.value })
    maskedPhoneNumber.value = response.masked_phone_number
    otpDigits.value = ['', '', '', '', '']
    startCountdown(response.resend_available_in_seconds ?? 0)
    await nextTick()
    focusOtp(0)
  } catch (error) {
    errorMessage.value = isInvitedAccountMode.value ? resolveInvitedAccountError(error) : resolveForgotPasswordError(error)
  } finally {
    requestSubmitting.value = false
    resendSubmitting.value = false
  }
}

function resolveChangePasswordError(error: unknown) {
  if (error instanceof TypeError) return strings.value.networkError
  if (error instanceof ApiError) {
    const message = error.message.toLowerCase()
    if (error.status === 401) return strings.value.currentPasswordInvalid
    if (message.includes('password') && (message.includes('8') || message.includes('least'))) return strings.value.passwordTooShort
    if (message.includes('failed to fetch') || message.includes('network') || message.includes('load failed')) return strings.value.networkError
  }
  return strings.value.changePasswordFailed
}

function resolveForgotPasswordError(error: unknown) {
  if (error instanceof TypeError) return strings.value.networkError
  if (error instanceof ApiError) {
    const payload = error.payload as { error?: { code?: string } }
    const code = payload?.error?.code
    if (code === 'reset_account_not_found') return strings.value.forgotPasswordAccountNotFound
    if (code === 'password_reset_phone_missing') return strings.value.forgotPasswordPhoneMissing
    if (code === 'password_reset_code_invalid') return strings.value.forgotPasswordCodeInvalid
    if (code === 'password_reset_code_expired') return strings.value.forgotPasswordCodeExpired
    if (code === 'password_reset_code_not_found') return strings.value.forgotPasswordCodeNotFound
    if (code === 'password_reset_attempts_exceeded') return strings.value.forgotPasswordAttemptsExceeded
    if (code === 'password_reset_token_invalid') return strings.value.forgotPasswordTokenInvalid
    if (code === 'password_reset_rate_limited') return strings.value.phoneVerificationRateLimited
    if (error.message.toLowerCase().includes('failed to fetch')) return strings.value.networkError
  }
  return strings.value.forgotPasswordRequestFailed
}

function resolveInvitedAccountError(error: unknown) {
  if (error instanceof TypeError) return strings.value.networkError
  if (error instanceof ApiError) {
    const payload = error.payload as { error?: { code?: string } }
    const code = payload?.error?.code
    if (code === 'invited_account_token_invalid') return strings.value.invitedAccountTokenInvalid
    if (code === 'invited_account_phone_missing') return strings.value.invitedAccountPhoneMissing
    if (code === 'invited_account_phone_unverified') return strings.value.invitedAccountPhoneUnverified
    if (code === 'phone_verification_code_invalid') return strings.value.phoneVerificationCodeInvalid
    if (code === 'phone_verification_code_expired') return strings.value.phoneVerificationCodeExpired
    if (code === 'phone_verification_code_not_found') return strings.value.phoneVerificationCodeNotFound
    if (code === 'phone_verification_attempts_exceeded') return strings.value.phoneVerificationAttemptsExceeded
    if (code === 'phone_verification_rate_limited') return strings.value.phoneVerificationRateLimited
    if (code === 'phone_verification_not_configured') return strings.value.phoneVerificationNotConfigured
    if (code === 'sms_provider_error') return strings.value.phoneVerificationSmsFailed
    if (error.message.toLowerCase().includes('failed to fetch')) return strings.value.networkError
  }
  return strings.value.invitedAccountRequestFailed
}

onBeforeUnmount(() => {
  stopCountdown()
})
</script>

<template>
  <div class="page-shell auth-page-shell">
    <div class="auth-card surface-card page-stack auth-form-card">
      <HeroCard :title="heroTitle" :subtitle="heroSubtitle" icon="◍" />

      <template v-if="!isForgotPasswordMode && !isInvitedAccountMode">
        <div class="form-field">
          <label class="form-field__label">{{ strings.currentPasswordLabel }}</label>
          <PasswordField
            v-model="form.currentPassword"
            autocomplete="current-password"
            :disabled="isSubmitting"
            :show-label="strings.showPasswordLabel"
            :hide-label="strings.hidePasswordLabel"
          />
        </div>
        <div class="form-field">
          <label class="form-field__label">{{ strings.newPasswordLabel }}</label>
          <PasswordField
            v-model="form.newPassword"
            autocomplete="new-password"
            :disabled="isSubmitting"
            :show-label="strings.showPasswordLabel"
            :hide-label="strings.hidePasswordLabel"
          />
        </div>
      </template>

      <template v-else-if="isIdentifierStep">
        <div class="form-field">
          <label class="form-field__label">{{ strings.forgotPasswordIdentifierLabel }}</label>
          <input
            v-model="form.identifier"
            class="text-input"
            type="text"
            autocomplete="username"
            :placeholder="strings.forgotPasswordIdentifierPlaceholder"
            :disabled="requestSubmitting"
          />
        </div>
      </template>

      <template v-else-if="isCodeStep">
        <div class="form-field">
          <label class="form-field__label">{{ strings.phoneVerificationCodeLabel }}</label>
          <div class="auth-verification__otp" @paste="onOtpPaste">
            <input
              v-for="(_, index) in otpDigits"
              :key="`forgot-password-digit-${index}`"
              :ref="(element) => setOtpRef(index, element)"
              :value="otpDigits[index]"
              class="text-input auth-verification__otp-input"
              type="text"
              inputmode="numeric"
              maxlength="1"
              @input="onOtpInput(index, ($event.target as HTMLInputElement).value)"
              @keydown="onOtpKeydown(index, $event)"
            />
          </div>
        </div>
        <button class="outline-button" type="button" :disabled="!canResendCode" @click="resendCode">
          {{
            countdownSeconds > 0
              ? strings.phoneVerificationResendCountdown.replace('{seconds}', String(countdownSeconds))
              : strings.phoneVerificationResendAction
          }}
        </button>
      </template>

      <template v-else>
        <div class="form-field">
          <label class="form-field__label">{{ strings.newPasswordLabel }}</label>
          <PasswordField
            v-model="form.newPassword"
            autocomplete="new-password"
            :disabled="isSubmitting"
            :show-label="strings.showPasswordLabel"
            :hide-label="strings.hidePasswordLabel"
          />
        </div>
        <div class="form-field">
          <label class="form-field__label">{{ strings.forgotPasswordConfirmPasswordLabel }}</label>
          <PasswordField
            v-model="form.confirmNewPassword"
            autocomplete="new-password"
            :disabled="isSubmitting"
            :show-label="strings.showPasswordLabel"
            :hide-label="strings.hidePasswordLabel"
          />
        </div>
      </template>

      <Transition name="auth-error-transition">
        <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
          <strong>{{ strings.authErrorTitle }}</strong>
          <span>{{ errorMessage }}</span>
        </div>
      </Transition>

      <Transition name="auth-error-transition">
        <div v-if="infoMessage" class="auth-alert" role="status">
          <span>{{ infoMessage }}</span>
        </div>
      </Transition>

      <button class="filled-button" type="button" :disabled="isSubmitting || requestSubmitting || verifySubmitting" @click="submit">
        <span v-if="isSubmitting || requestSubmitting || verifySubmitting" class="button-loader" aria-hidden="true"></span>
        {{
          (isSubmitting || requestSubmitting || verifySubmitting)
            ? loadingLabel
            : (!isForgotPasswordMode && !isInvitedAccountMode)
              ? strings.changePasswordAction
              : isInvitedAccountMode
                ? isCodeStep
                  ? strings.forgotPasswordVerifyAction
                  : strings.forgotPasswordConfirmAction
                : isIdentifierStep
                ? strings.forgotPasswordRequestAction
                : isCodeStep
                  ? strings.forgotPasswordVerifyAction
                  : strings.forgotPasswordConfirmAction
        }}
      </button>

      <RouterLink v-if="isForgotPasswordMode || isInvitedAccountMode" to="/auth/login" class="auth-link">{{ strings.goToLogin }}</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.auth-form-card {
  gap: 18px;
}

.text-input {
  border-radius: 22px;
  min-height: 54px;
  padding-inline: 18px;
}

:deep(.password-field__input) {
  border-radius: 22px;
  min-height: 54px;
  padding-inline: 18px;
  padding-inline-end: 52px;
}

.auth-verification__otp {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  direction: ltr;
}

.auth-verification__otp-input {
  text-align: center;
  font-size: 20px;
  line-height: 28px;
  font-weight: 700;
}
</style>
