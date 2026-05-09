<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { fillOtpDigitsFromInput, mergeOtpDigits, normalizeOtpDigit, normalizePhoneCandidate } from '@/modules/auth/phoneVerification'
import Icon from '@/shared/components/Icon.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { strings, language } = storeToRefs(settingsStore)
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
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
let countdownTimer: number | null = null

const isRtl = computed(() => language.value === 'fa')
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
    if (isCodeStep.value) return strings.value.invitedAccountCodeSubtitle
    if (isResetStep.value) return strings.value.invitedAccountResetSubtitle
    return strings.value.invitedAccountSubtitle
  }
  if (isIdentifierStep.value) return strings.value.forgotPasswordSubtitle
  if (isCodeStep.value) return strings.value.forgotPasswordCodeSubtitle
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
const canResendCode = computed(() => countdownSeconds.value <= 0 && !resendSubmitting.value && !requestSubmitting.value)

const isChangePasswordMode = computed(() => !isForgotPasswordMode.value && !isInvitedAccountMode.value)

function stepLabel(current: number, total: number) {
  if (isRtl.value) {
    const toFa = (n: number) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
    return `مرحله ${toFa(current)} از ${toFa(total)}`
  }
  return `Step ${current} of ${total}`
}

const transitionKey = computed(() => {
  if (isChangePasswordMode.value) return 'change-password'
  if (isCodeStep.value) return 'code'
  if (isResetStep.value) return 'reset'
  if (isIdentifierStep.value) return 'identifier'
  return 'invited-init'
})

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

function setOtpRef(index: number, element: unknown) {
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
  maybeAutoSubmitOtp()
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
    otpDigits.value[index - 1] = ''
    const prev = otpRefs.value[index - 1]
    if (prev) {
      prev.value = ''
      prev.focus()
    }
  }
}

function onOtpPaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData('text') ?? ''
  const digits = fillOtpDigitsFromInput(pasted, otpDigits.value.length)
  if (digits.every((digit) => !digit)) return
  event.preventDefault()
  otpDigits.value = digits
  focusOtp(digits.reduce((last, digit, index) => (digit ? index : last), 0))
  maybeAutoSubmitOtp()
}

let autoSubmitGuard = false
function maybeAutoSubmitOtp() {
  if (!isCodeStep.value) return
  if (autoSubmitGuard || verifySubmitting.value) return
  if (otpDigits.value.some((digit) => !digit)) return
  autoSubmitGuard = true
  window.setTimeout(() => {
    autoSubmitGuard = false
    submit()
  }, 80)
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
    otpDigits.value = ['', '', '', '', '']
    await nextTick()
    focusOtp(0)
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
    otpDigits.value = ['', '', '', '', '']
    await nextTick()
    focusOtp(0)
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

function backToIdentifier() {
  requestedIdentifier.value = ''
  otpDigits.value = ['', '', '', '', '']
  stopCountdown()
}

onBeforeUnmount(() => {
  stopCountdown()
})
</script>

<template>
  <div class="page-shell auth-page-shell">
    <Transition name="auth-screen-fade" mode="out-in">
      <div :key="transitionKey" class="auth-screen">
        <!-- Change password (authenticated user) -->
        <template v-if="isChangePasswordMode">
          <div class="auth-icon-badge" aria-hidden="true">
            <Icon name="lock" :size="24" />
          </div>

          <h1 class="auth-title">{{ heroTitle }}</h1>
          <p class="auth-subtitle">{{ heroSubtitle }}</p>

          <div class="auth-field">
            <label class="auth-field__label" for="cp-current">{{ strings.currentPasswordLabel }}</label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="lock" :size="18" />
              </span>
              <input
                id="cp-current"
                v-model="form.currentPassword"
                class="auth-input auth-input--with-icon auth-input--with-trailing"
                :type="showCurrent ? 'text' : 'password'"
                autocomplete="current-password"
                :disabled="isSubmitting"
              />
              <button class="auth-input__trailing" type="button" :aria-label="showCurrent ? strings.hidePasswordLabel : strings.showPasswordLabel" :disabled="isSubmitting" @click="showCurrent = !showCurrent">
                <Icon name="eye" :size="18" />
              </button>
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="cp-new">{{ strings.newPasswordLabel }}</label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="lock" :size="18" />
              </span>
              <input
                id="cp-new"
                v-model="form.newPassword"
                class="auth-input auth-input--with-icon auth-input--with-trailing"
                :type="showNew ? 'text' : 'password'"
                autocomplete="new-password"
                :disabled="isSubmitting"
              />
              <button class="auth-input__trailing" type="button" :aria-label="showNew ? strings.hidePasswordLabel : strings.showPasswordLabel" :disabled="isSubmitting" @click="showNew = !showNew">
                <Icon name="eye" :size="18" />
              </button>
            </div>
          </div>

          <Transition name="auth-error-transition">
            <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
              <strong>{{ strings.authErrorTitle }}</strong>
              <span>{{ errorMessage }}</span>
            </div>
          </Transition>

          <button class="auth-cta" type="button" :disabled="isSubmitting" @click="submit">
            <span v-if="isSubmitting" class="button-loader" aria-hidden="true"></span>
            {{ isSubmitting ? loadingLabel : strings.changePasswordAction }}
          </button>
        </template>

        <!-- Forgot password — request identifier -->
        <template v-else-if="isIdentifierStep">
          <RouterLink to="/auth/login" class="auth-back-link">
            <Icon :name="isRtl ? 'arrow-right' : 'arrow-left'" :size="18" />
            {{ strings.goToLogin }}
          </RouterLink>

          <div class="auth-icon-badge" aria-hidden="true">
            <Icon name="lock" :size="24" />
          </div>

          <div class="auth-title-row">
            <h1 class="auth-title">{{ heroTitle }}</h1>
            <span class="auth-step-pill">
              <span class="auth-step-pill__dot"></span>
              <span>{{ stepLabel(1, 3) }}</span>
            </span>
          </div>
          <p class="auth-subtitle">{{ heroSubtitle }}</p>

          <div class="auth-field">
            <label class="auth-field__label" for="forgot-identifier">{{ strings.forgotPasswordIdentifierLabel }}</label>
            <input
              id="forgot-identifier"
              v-model="form.identifier"
              class="auth-input"
              type="text"
              autocomplete="username"
              :placeholder="strings.forgotPasswordIdentifierPlaceholder"
              :disabled="requestSubmitting"
            />
          </div>

          <Transition name="auth-error-transition">
            <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
              <strong>{{ strings.authErrorTitle }}</strong>
              <span>{{ errorMessage }}</span>
            </div>
          </Transition>

          <button class="auth-cta" type="button" :disabled="requestSubmitting" @click="submit">
            <span v-if="requestSubmitting" class="button-loader" aria-hidden="true"></span>
            <span>{{ requestSubmitting ? loadingLabel : strings.forgotPasswordRequestAction }}</span>
            <Icon v-if="!requestSubmitting" :name="isRtl ? 'arrow-left' : 'arrow-right'" :size="18" />
          </button>
        </template>

        <!-- Code step (forgot password OR invited account) -->
        <template v-else-if="isCodeStep">
          <button class="auth-back-link" type="button" :disabled="verifySubmitting || requestSubmitting" @click="isForgotPasswordMode ? backToIdentifier() : router.replace('/auth/login')">
            <Icon :name="isRtl ? 'arrow-right' : 'arrow-left'" :size="18" />
            {{ isForgotPasswordMode ? strings.forgotPasswordCodeBackLabel : strings.goToLogin }}
          </button>

          <div class="auth-title-row">
            <h1 class="auth-title">{{ heroTitle }}</h1>
            <span class="auth-step-pill auth-step-pill--accent">
              <span class="auth-step-pill__dot"></span>
              <span>{{ stepLabel(2, isInvitedAccountMode ? 2 : 3) }}</span>
            </span>
          </div>
          <p class="auth-subtitle">
            {{ heroSubtitle }}
            <bdi v-if="maskedPhoneNumber" class="num auth-phone-callout">{{ maskedPhoneNumber }}</bdi>
          </p>

          <div class="auth-otp-grid" @paste="onOtpPaste">
            <input
              v-for="(_, index) in otpDigits"
              :key="`reset-digit-${index}`"
              :ref="(element) => setOtpRef(index, element)"
              :value="otpDigits[index]"
              class="auth-otp-cell"
              :class="{ 'is-filled': !!otpDigits[index] }"
              type="text"
              inputmode="numeric"
              maxlength="1"
              :disabled="verifySubmitting"
              @input="onOtpInput(index, ($event.target as HTMLInputElement).value)"
              @keydown="onOtpKeydown(index, $event)"
            />
          </div>

          <Transition name="auth-error-transition">
            <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
              <strong>{{ strings.authErrorTitle }}</strong>
              <span>{{ errorMessage }}</span>
            </div>
          </Transition>

          <button class="auth-cta" type="button" :disabled="verifySubmitting" @click="submit">
            <span v-if="verifySubmitting" class="button-loader" aria-hidden="true"></span>
            {{ verifySubmitting ? loadingLabel : strings.forgotPasswordVerifyAction }}
          </button>

          <div class="auth-resend-row">
            <template v-if="countdownSeconds > 0">
              <Icon name="refresh" :size="16" />
              <span>{{ strings.resendInLabel }}</span>
              <span class="num">0:{{ String(countdownSeconds).padStart(2, '0') }}</span>
            </template>
            <button v-else type="button" :disabled="!canResendCode" @click="resendCode">
              <Icon name="refresh" :size="16" />
              {{ strings.resendCodeLabel }}
            </button>
          </div>
        </template>

        <!-- Reset step (set new password) -->
        <template v-else-if="isResetStep">
          <div class="auth-icon-badge" aria-hidden="true">
            <Icon name="shield" :size="24" />
          </div>

          <div class="auth-title-row">
            <h1 class="auth-title">{{ heroTitle }}</h1>
            <span v-if="isForgotPasswordMode" class="auth-step-pill">
              <span class="auth-step-pill__dot"></span>
              <span>{{ stepLabel(3, 3) }}</span>
            </span>
          </div>
          <p class="auth-subtitle">{{ heroSubtitle }}</p>

          <div class="auth-field">
            <label class="auth-field__label" for="reset-new">{{ strings.newPasswordLabel }}</label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="lock" :size="18" />
              </span>
              <input
                id="reset-new"
                v-model="form.newPassword"
                class="auth-input auth-input--with-icon auth-input--with-trailing"
                :type="showNew ? 'text' : 'password'"
                autocomplete="new-password"
                :disabled="isSubmitting"
              />
              <button class="auth-input__trailing" type="button" :aria-label="showNew ? strings.hidePasswordLabel : strings.showPasswordLabel" :disabled="isSubmitting" @click="showNew = !showNew">
                <Icon name="eye" :size="18" />
              </button>
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="reset-confirm">{{ strings.forgotPasswordConfirmPasswordLabel }}</label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="lock" :size="18" />
              </span>
              <input
                id="reset-confirm"
                v-model="form.confirmNewPassword"
                class="auth-input auth-input--with-icon auth-input--with-trailing"
                :type="showConfirm ? 'text' : 'password'"
                autocomplete="new-password"
                :disabled="isSubmitting"
              />
              <button class="auth-input__trailing" type="button" :aria-label="showConfirm ? strings.hidePasswordLabel : strings.showPasswordLabel" :disabled="isSubmitting" @click="showConfirm = !showConfirm">
                <Icon name="eye" :size="18" />
              </button>
            </div>
          </div>

          <Transition name="auth-error-transition">
            <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
              <strong>{{ strings.authErrorTitle }}</strong>
              <span>{{ errorMessage }}</span>
            </div>
          </Transition>

          <button class="auth-cta" type="button" :disabled="isSubmitting" @click="submit">
            <span v-if="isSubmitting" class="button-loader" aria-hidden="true"></span>
            {{ isSubmitting ? loadingLabel : strings.forgotPasswordConfirmAction }}
          </button>
        </template>

        <!-- Invited account preparing (rare fallback) -->
        <template v-else>
          <div class="auth-icon-badge" aria-hidden="true">
            <Icon name="plus" :size="24" />
          </div>
          <h1 class="auth-title">{{ heroTitle }}</h1>
          <p class="auth-subtitle">{{ heroSubtitle }}</p>
          <Transition name="auth-error-transition">
            <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
              <strong>{{ strings.authErrorTitle }}</strong>
              <span>{{ errorMessage }}</span>
            </div>
          </Transition>
          <div class="auth-resend-row">
            <span class="button-loader" aria-hidden="true" style="border-color: color-mix(in srgb, var(--brand) 30%, transparent); border-top-color: var(--brand);"></span>
            <span>{{ strings.invitedAccountPreparingLoading }}</span>
          </div>
        </template>

        <div v-if="isForgotPasswordMode || isInvitedAccountMode" class="auth-spacer"></div>
        <RouterLink v-if="(isForgotPasswordMode || isInvitedAccountMode) && !isIdentifierStep && !isCodeStep" to="/auth/login" class="auth-link--inline" style="align-self: center;">
          {{ strings.goToLogin }}
        </RouterLink>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.auth-screen-fade-enter-active,
.auth-screen-fade-leave-active {
  transition: opacity var(--d-base) var(--ease-emphasized), transform var(--d-base) var(--ease-emphasized);
}
.auth-screen-fade-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.99);
}
.auth-screen-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.99);
}

.auth-screen .auth-field:nth-of-type(1) { --rise-step: 1; }
.auth-screen .auth-field:nth-of-type(2) { --rise-step: 2; }
.auth-screen .auth-field:nth-of-type(3) { --rise-step: 3; }
.auth-field { animation-delay: calc(var(--rise-step, 0) * 60ms); }

.auth-phone-callout {
  display: inline;
  direction: ltr;
  font-weight: var(--fw-semibold);
  color: var(--fg);
}
</style>
