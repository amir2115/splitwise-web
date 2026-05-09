<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { ApiError } from '@/shared/api/client'
import { fillOtpDigitsFromInput, mergeOtpDigits, normalizeOtpDigit, normalizePhoneInput } from '@/modules/auth/phoneVerification'
import Icon from '@/shared/components/Icon.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { strings, language } = storeToRefs(settingsStore)
const { isSubmitting } = storeToRefs(authStore)

const form = reactive({
  name: '',
  username: '',
  password: '',
  confirmPassword: '',
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
const showPassword = ref(false)
const showConfirmPassword = ref(false)
let countdownTimer: number | null = null

const isRtl = computed(() => language.value === 'fa')
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
    form.confirmPassword = ''
  },
  { immediate: true },
)

const loadingLabel = computed(() => {
  if (!isRegisterMode.value) return strings.value.loginLoading
  return isRegisterVerificationStep.value ? strings.value.phoneVerificationVerifyLoading : strings.value.registerLoading
})
const heroTitle = computed(() => {
  if (!isRegisterMode.value) return strings.value.loginTitle
  return isRegisterVerificationStep.value ? strings.value.phoneVerifyOtpTitle : strings.value.registerTitle
})
const heroSubtitle = computed(() => {
  if (!isRegisterMode.value) return strings.value.loginSubtitle
  return isRegisterVerificationStep.value
    ? strings.value.phoneVerifyCodeSubtitle
    : strings.value.registerSubtitle
})

function stepLabel(current: number, total: number) {
  if (isRtl.value) {
    const toFa = (n: number) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
    return `مرحله ${toFa(current)} از ${toFa(total)}`
  }
  return `Step ${current} of ${total}`
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
  if (normalized && index < otpDigits.value.length - 1) focusOtp(index + 1)
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
  maybeAutoSubmitOtp()
}

let autoSubmitGuard = false
function maybeAutoSubmitOtp() {
  if (!isRegisterVerificationStep.value) return
  if (autoSubmitGuard || isSubmitting.value) return
  if (otpDigits.value.some((digit) => !digit)) return
  autoSubmitGuard = true
  // Defer to give the input event a frame to settle, then submit
  window.setTimeout(() => {
    autoSubmitGuard = false
    submit()
  }, 80)
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
      otpDigits.value = ['', '', '', '', '']
      await nextTick()
      focusOtp(0)
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
  if (isRegisterMode.value && form.confirmPassword !== form.password) {
    errorMessage.value = strings.value.forgotPasswordPasswordMismatch
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
    if (!isRegister && (code === 'invalid_credentials' || error.status === 401)) return appStrings.invalidCredentials
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

function togglePassword() { showPassword.value = !showPassword.value }
function toggleConfirmPassword() { showConfirmPassword.value = !showConfirmPassword.value }
</script>

<template>
  <div class="page-shell auth-page-shell">
    <Transition name="auth-screen-fade" mode="out-in">
      <div :key="(isRegisterMode ? 'register' : 'login') + '-' + (isRegisterVerificationStep ? 'verify' : 'form')" class="auth-screen">
        <!-- VERIFICATION STEP (after register submit) -->
        <template v-if="isRegisterVerificationStep">
          <button class="auth-back-link" type="button" :disabled="isSubmitting" @click="registrationId = ''">
            <Icon :name="isRtl ? 'arrow-right' : 'arrow-left'" :size="18" />
            {{ strings.phoneVerificationChangePhoneAction }}
          </button>

          <div class="auth-title-row">
            <h1 class="auth-title">{{ heroTitle }}</h1>
            <span class="auth-step-pill auth-step-pill--accent">
              <span class="auth-step-pill__dot"></span>
              <span>{{ stepLabel(2, 2) }}</span>
            </span>
          </div>
          <p class="auth-subtitle">
            {{ heroSubtitle }}
            <bdi class="num auth-phone-callout">{{ requestedPhoneNumber }}</bdi>
          </p>

          <div class="auth-otp-grid" @paste="onOtpPaste">
            <input
              v-for="(_, index) in otpDigits"
              :key="`register-digit-${index}`"
              :ref="(element) => setOtpRef(index, element)"
              :value="otpDigits[index]"
              class="auth-otp-cell"
              :class="{ 'is-filled': !!otpDigits[index] }"
              type="text"
              inputmode="numeric"
              maxlength="1"
              :disabled="isSubmitting"
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
          <button class="auth-cta" type="button" :disabled="isSubmitting" @click="submit">
            <span v-if="isSubmitting" class="button-loader" aria-hidden="true"></span>
            {{ isSubmitting ? loadingLabel : strings.phoneVerificationVerifyAction }}
          </button>

          <div class="auth-resend-row">
            <template v-if="countdownSeconds > 0">
              <Icon name="refresh" :size="16" />
              <span>{{ strings.resendInLabel }}</span>
              <span class="num">0:{{ String(countdownSeconds).padStart(2, '0') }}</span>
            </template>
            <button v-else type="button" :disabled="isSubmitting" @click="resendRegisterCode">
              <Icon name="refresh" :size="16" />
              {{ strings.resendCodeLabel }}
            </button>
          </div>

          <div class="auth-spacer"></div>
          <div class="auth-divider">
            <span>{{ strings.authSwitchToLoginPrompt }}</span>
            <button type="button" class="auth-meta-row__link" @click="switchMode">{{ strings.authSwitchToLoginCta }}</button>
          </div>
        </template>

        <!-- LOGIN -->
        <template v-else-if="!isRegisterMode">
          <div class="auth-logo-mark" aria-hidden="true">◐</div>
          <h1 class="auth-title">{{ heroTitle }}</h1>
          <p class="auth-subtitle">{{ heroSubtitle }}</p>

          <div class="auth-field">
            <label class="auth-field__label" for="auth-login-username">{{ strings.usernameLabel }}</label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="users" :size="18" />
              </span>
              <input
                id="auth-login-username"
                v-model="form.username"
                class="auth-input auth-input--with-icon"
                type="text"
                autocomplete="username"
                :disabled="isSubmitting"
              />
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="auth-login-password">{{ strings.passwordLabel }}</label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="lock" :size="18" />
              </span>
              <input
                id="auth-login-password"
                v-model="form.password"
                class="auth-input auth-input--with-icon auth-input--with-trailing"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :disabled="isSubmitting"
              />
              <button
                class="auth-input__trailing"
                type="button"
                :title="showPassword ? strings.hidePasswordLabel : strings.showPasswordLabel"
                :aria-label="showPassword ? strings.hidePasswordLabel : strings.showPasswordLabel"
                :disabled="isSubmitting"
                @click="togglePassword"
              >
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
            {{ isSubmitting ? loadingLabel : strings.loginAction }}
          </button>

          <RouterLink to="/auth/forgot-password" class="auth-link--inline" style="align-self: center;">
            {{ strings.forgotPasswordAction }}
          </RouterLink>

          <div class="auth-spacer"></div>
          <div class="auth-meta-row">
            <span>{{ strings.authSwitchToRegisterPrompt }}</span>
            <button type="button" class="auth-meta-row__link" :disabled="isSubmitting" @click="switchMode">{{ strings.authSwitchToRegisterCta }}</button>
          </div>
        </template>

        <!-- REGISTER -->
        <template v-else>
          <div class="auth-title-row">
            <h1 class="auth-title">{{ heroTitle }}</h1>
            <span class="auth-step-pill">
              <span class="auth-step-pill__dot"></span>
              <span>{{ stepLabel(1, 2) }}</span>
            </span>
          </div>
          <p class="auth-subtitle">{{ heroSubtitle }}</p>

          <div class="auth-field">
            <label class="auth-field__label" for="auth-register-name">{{ strings.nameLabel }}</label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="users" :size="18" />
              </span>
              <input
                id="auth-register-name"
                v-model="form.name"
                class="auth-input auth-input--with-icon"
                type="text"
                autocomplete="name"
                :disabled="isSubmitting"
              />
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="auth-register-username">{{ strings.usernameLabel }}</label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="user-plus" :size="18" />
              </span>
              <input
                id="auth-register-username"
                v-model="form.username"
                class="auth-input auth-input--with-icon"
                type="text"
                autocomplete="username"
                :disabled="isSubmitting"
              />
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="auth-register-phone">{{ strings.phoneVerificationPhoneLabel }}</label>
            <input
              id="auth-register-phone"
              v-model="form.phone_number"
              class="auth-input"
              type="tel"
              inputmode="numeric"
              :placeholder="strings.phoneVerificationPhonePlaceholder"
              :disabled="isSubmitting"
              style="font-family: var(--font-en); letter-spacing: 0.02em; direction: ltr; text-align: left;"
            />
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="auth-register-password">{{ strings.passwordLabel }}</label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="lock" :size="18" />
              </span>
              <input
                id="auth-register-password"
                v-model="form.password"
                class="auth-input auth-input--with-icon auth-input--with-trailing"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :disabled="isSubmitting"
              />
              <button
                class="auth-input__trailing"
                type="button"
                :title="showPassword ? strings.hidePasswordLabel : strings.showPasswordLabel"
                :aria-label="showPassword ? strings.hidePasswordLabel : strings.showPasswordLabel"
                :disabled="isSubmitting"
                @click="togglePassword"
              >
                <Icon name="eye" :size="18" />
              </button>
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="auth-register-confirm">
              {{ strings.forgotPasswordConfirmPasswordLabel }}
            </label>
            <div class="auth-input-wrap">
              <span class="auth-input__icon" aria-hidden="true">
                <Icon name="lock" :size="18" />
              </span>
              <input
                id="auth-register-confirm"
                v-model="form.confirmPassword"
                class="auth-input auth-input--with-icon auth-input--with-trailing"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :disabled="isSubmitting"
              />
              <button
                class="auth-input__trailing"
                type="button"
                :title="showConfirmPassword ? strings.hidePasswordLabel : strings.showPasswordLabel"
                :aria-label="showConfirmPassword ? strings.hidePasswordLabel : strings.showPasswordLabel"
                :disabled="isSubmitting"
                @click="toggleConfirmPassword"
              >
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
            <span>{{ isSubmitting ? loadingLabel : strings.registerAction }}</span>
            <Icon v-if="!isSubmitting" :name="isRtl ? 'arrow-left' : 'arrow-right'" :size="18" />
          </button>

          <div class="auth-spacer"></div>
          <div class="auth-meta-row">
            <span>{{ strings.goToLogin }}</span>
            <button type="button" class="auth-meta-row__link" :disabled="isSubmitting" @click="switchMode">{{ strings.loginTitle }}</button>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.auth-phone-callout {
  display: inline;
  direction: ltr;
  font-weight: var(--fw-semibold);
  color: var(--fg);
}

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

/* stagger the field rise by index */
.auth-field { animation-delay: calc(var(--rise-step, 0) * 60ms); }
.auth-screen .auth-field:nth-of-type(1) { --rise-step: 1; }
.auth-screen .auth-field:nth-of-type(2) { --rise-step: 2; }
.auth-screen .auth-field:nth-of-type(3) { --rise-step: 3; }
.auth-screen .auth-field:nth-of-type(4) { --rise-step: 4; }
.auth-screen .auth-field:nth-of-type(5) { --rise-step: 5; }
</style>
