<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import HeroCard from '@/shared/components/HeroCard.vue'
import PasswordField from '@/shared/components/PasswordField.vue'
import { ApiError } from '@/shared/api/client'
import { fillOtpDigitsFromInput, mergeOtpDigits, normalizeOtpDigit, normalizePhoneInput } from '@/modules/auth/phoneVerification'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { strings } = storeToRefs(settingsStore)
const { isSubmitting } = storeToRefs(authStore)

const form = reactive({
  name: '',
  username: '',
  password: '',
  phone_number: '',
})

const isRegisterMode = ref(route.meta.authMode === 'register')
const errorMessage = ref('')
const infoMessage = ref('')
const registrationId = ref('')
const requestedPhoneNumber = ref('')
const otpDigits = ref(['', '', '', '', ''])
const otpRefs = ref<Array<HTMLInputElement | null>>([])
const countdownSeconds = ref(0)
let countdownTimer: number | null = null

const isRegisterVerificationStep = computed(() => isRegisterMode.value && Boolean(registrationId.value))
const registerCode = computed(() => mergeOtpDigits(otpDigits.value))

watch(
  () => route.meta.authMode,
  (value) => {
    isRegisterMode.value = value === 'register'
    errorMessage.value = ''
    infoMessage.value = ''
    registrationId.value = ''
    requestedPhoneNumber.value = ''
    otpDigits.value = ['', '', '', '', '']
    form.phone_number = ''
  },
  { immediate: true },
)

const loadingLabel = computed(() => {
  if (!isRegisterMode.value) return strings.value.loginLoading
  return isRegisterVerificationStep.value ? strings.value.phoneVerificationVerifyLoading : strings.value.registerLoading
})
const heroTitle = computed(() => {
  if (!isRegisterMode.value) return strings.value.loginTitle
  return isRegisterVerificationStep.value ? strings.value.phoneVerificationCodeLabel : strings.value.registerTitle
})
const heroSubtitle = computed(() => {
  if (!isRegisterMode.value) return strings.value.loginSubtitle
  return isRegisterVerificationStep.value
    ? `${strings.value.phoneVerificationVerifiedSubtitle} ${requestedPhoneNumber.value}`
    : strings.value.registerSubtitle
})

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
  if (normalized && index < otpDigits.value.length - 1) focusOtp(index + 1)
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
}

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

async function submit() {
  errorMessage.value = ''
  infoMessage.value = ''

  if (isRegisterVerificationStep.value) {
    if (registerCode.value.length !== otpDigits.value.length) {
      errorMessage.value = strings.value.phoneVerificationCodeInvalid
      return
    }
    try {
      await authStore.verifyRegister({ registration_id: registrationId.value, code: registerCode.value })
      router.replace('/groups')
    } catch (error) {
      errorMessage.value = resolveAuthError(error, true, strings.value)
    }
    return
  }

  if (isRegisterMode.value && !form.name.trim()) {
    errorMessage.value = strings.value.nameRequired
    return
  }

  if (!form.username.trim()) {
    errorMessage.value = strings.value.usernameRequired
    return
  }

  if (!form.password) {
    errorMessage.value = strings.value.passwordRequired
    return
  }

  if (isRegisterMode.value && form.password.length < 8) {
    errorMessage.value = strings.value.passwordTooShort
    return
  }
  if (isRegisterMode.value && normalizePhoneInput(form.phone_number).length !== 11) {
    errorMessage.value = strings.value.phoneVerificationInvalidPhone
    return
  }

  try {
    if (isRegisterMode.value) {
      const response = await authStore.requestRegister({
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        phone_number: normalizePhoneInput(form.phone_number),
      })
      registrationId.value = response.registration_id
      requestedPhoneNumber.value = response.phone_number
      infoMessage.value = strings.value.phoneVerificationCodeSent
      otpDigits.value = ['', '', '', '', '']
      startCountdown(response.resend_available_in_seconds)
      await nextTick()
      focusOtp(0)
      return
    } else {
      await authStore.login({
        username: form.username.trim(),
        password: form.password,
      })
      router.replace('/groups')
      return
    }
  } catch (error) {
    errorMessage.value = resolveAuthError(error, isRegisterMode.value, strings.value)
  }
}

function switchMode() {
  stopCountdown()
  router.replace(isRegisterMode.value ? '/auth/login' : '/auth/register')
}

async function resendRegisterCode() {
  if (!registrationId.value || countdownSeconds.value > 0) return
  errorMessage.value = ''
  infoMessage.value = ''
  try {
    const response = await authStore.resendRegisterCode({ registration_id: registrationId.value })
    requestedPhoneNumber.value = response.phone_number
    infoMessage.value = strings.value.phoneVerificationCodeSent
    otpDigits.value = ['', '', '', '', '']
    startCountdown(response.resend_available_in_seconds)
    await nextTick()
    focusOtp(0)
  } catch (error) {
    errorMessage.value = resolveAuthError(error, true, strings.value)
  }
}

function resolveAuthError(error: unknown, isRegister: boolean, appStrings: typeof strings.value) {
  if (error instanceof TypeError) return appStrings.networkError

  if (error instanceof ApiError) {
    const payload = error.payload as { error?: { code?: string } }
    const code = payload?.error?.code
    const message = error.message.toLowerCase()
    if (!isRegister && error.status === 401) return appStrings.invalidCredentials
    if (isRegister && code === 'registration_username_taken') return appStrings.usernameTaken
    if (isRegister && code === 'registration_phone_taken') return appStrings.phoneVerificationPhoneTaken
    if (isRegister && code === 'registration_code_invalid') return appStrings.phoneVerificationCodeInvalid
    if (isRegister && code === 'registration_code_expired') return appStrings.phoneVerificationCodeExpired
    if (isRegister && code === 'registration_not_found') return appStrings.phoneVerificationCodeNotFound
    if (isRegister && code === 'registration_attempts_exceeded') return appStrings.phoneVerificationAttemptsExceeded
    if (isRegister && code === 'registration_rate_limited') return appStrings.phoneVerificationRateLimited
    if (isRegister && message.includes('password') && (message.includes('8') || message.includes('eight') || message.includes('at least'))) {
      return appStrings.passwordTooShort
    }
    if (isRegister && (error.status === 409 || message.includes('already') || message.includes('taken') || message.includes('exists'))) {
      return appStrings.usernameTaken
    }
    if (message.includes('failed to fetch') || message.includes('network') || message.includes('load failed')) {
      return appStrings.networkError
    }
  }

  return isRegister ? appStrings.registerFailed : appStrings.loginFailed
}
</script>

<template>
  <div class="page-shell auth-page-shell">
    <div class="auth-card surface-card page-stack auth-form-card">
      <HeroCard :title="heroTitle" :subtitle="heroSubtitle" :icon="isRegisterMode ? '◎' : '◌'" />
      <template v-if="isRegisterVerificationStep">
        <div class="form-field">
          <label class="form-field__label">{{ strings.phoneVerificationCodeLabel }}</label>
          <div class="auth-register__otp" @paste="onOtpPaste">
            <input
              v-for="(_, index) in otpDigits"
              :key="`register-digit-${index}`"
              :ref="(element) => setOtpRef(index, element)"
              :value="otpDigits[index]"
              class="text-input auth-register__otp-input"
              type="text"
              inputmode="numeric"
              maxlength="1"
              :disabled="isSubmitting"
              @input="onOtpInput(index, ($event.target as HTMLInputElement).value)"
              @keydown="onOtpKeydown(index, $event)"
            />
          </div>
        </div>
        <button class="outline-button auth-register__resend" type="button" :disabled="countdownSeconds > 0 || isSubmitting" @click="resendRegisterCode">
          {{
            countdownSeconds > 0
              ? strings.phoneVerificationResendCountdown.replace('{seconds}', String(countdownSeconds))
              : strings.phoneVerificationResendAction
          }}
        </button>
      </template>
      <template v-else>
      <div v-if="isRegisterMode" class="form-field">
        <label class="form-field__label">{{ strings.nameLabel }}</label>
        <input v-model="form.name" class="text-input" type="text" autocomplete="name" :disabled="isSubmitting" />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.usernameLabel }}</label>
        <input v-model="form.username" class="text-input" type="text" autocomplete="username" :disabled="isSubmitting" />
      </div>
      <div v-if="isRegisterMode" class="form-field">
        <label class="form-field__label">{{ strings.phoneVerificationPhoneLabel }}</label>
        <input v-model="form.phone_number" class="text-input" type="text" inputmode="numeric" :placeholder="strings.phoneVerificationPhonePlaceholder" :disabled="isSubmitting" />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.passwordLabel }}</label>
        <PasswordField
          v-model="form.password"
          :autocomplete="isRegisterMode ? 'new-password' : 'current-password'"
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
      <button class="filled-button" type="button" :disabled="isSubmitting" @click="submit">
        <span v-if="isSubmitting" class="button-loader" aria-hidden="true"></span>
        {{
          isSubmitting
            ? loadingLabel
            : isRegisterVerificationStep
              ? strings.phoneVerificationVerifyAction
              : (isRegisterMode ? strings.registerAction : strings.loginAction)
        }}
      </button>
      <RouterLink v-if="!isRegisterMode" to="/auth/forgot-password" class="auth-link">{{ strings.forgotPasswordAction }}</RouterLink>
      <button class="auth-link auth-link--button" type="button" :disabled="isSubmitting" @click="switchMode">
        {{ isRegisterMode ? strings.goToLogin : strings.goToRegister }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.auth-link--button {
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.auth-register__otp {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  direction: ltr;
}

.auth-register__otp-input {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
}
</style>
