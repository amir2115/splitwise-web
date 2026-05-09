<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { resolveAppErrorMessage } from '@/shared/utils/apiErrors'
import { fillOtpDigitsFromInput, mergeOtpDigits, normalizeOtpDigit, normalizePhoneInput } from '@/modules/auth/phoneVerification'
import Icon from '@/shared/components/Icon.vue'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { strings, language } = storeToRefs(settingsStore)
const { user, requiresPhoneVerification } = storeToRefs(authStore)

const phoneInput = ref(user.value?.phone_number ?? '')
const requestedPhoneNumber = ref('')
const otpDigits = ref(['', '', '', '', ''])
const otpRefs = ref<Array<HTMLInputElement | null>>([])
const countdownSeconds = ref(0)
const requestSubmitting = ref(false)
const verifySubmitting = ref(false)
const resendSubmitting = ref(false)
const errorMessage = ref('')
let countdownTimer: number | null = null

const isRtl = computed(() => language.value === 'fa')

function stepLabel(current: number, total: number) {
  if (isRtl.value) {
    const toFa = (n: number) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
    return `مرحله ${toFa(current)} از ${toFa(total)}`
  }
  return `Step ${current} of ${total}`
}
const isVerificationStep = computed(() => Boolean(requestedPhoneNumber.value))
const otpValue = computed(() => mergeOtpDigits(otpDigits.value))
const normalizedPhoneInput = computed(() => normalizePhoneInput(phoneInput.value))
const normalizedDigits = computed(() => normalizedPhoneInput.value.replace(/^\+/, ''))
const hasValidPhoneLength = computed(() => normalizedDigits.value.length === 11 || normalizedDigits.value.length === 12)
const canSubmitPhone = computed(() => hasValidPhoneLength.value && !requestSubmitting.value)
const canResend = computed(() => countdownSeconds.value <= 0 && !resendSubmitting.value && !requestSubmitting.value)

watch(
  () => requiresPhoneVerification.value,
  (still) => {
    if (!still) router.replace('/groups')
  },
)

function setOtpRef(index: number, element: unknown) {
  otpRefs.value[index] = element instanceof HTMLInputElement ? element : null
}

function focusOtp(index: number) {
  otpRefs.value[index]?.focus()
  otpRefs.value[index]?.select()
}

function onPhoneInput(value: string) {
  phoneInput.value = normalizePhoneInput(value)
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

function onOtpInput(index: number, value: string) {
  const normalized = normalizeOtpDigit(value)
  otpDigits.value[index] = normalized
  if (normalized && index < otpDigits.value.length - 1) focusOtp(index + 1)
  maybeAutoSubmit()
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
  maybeAutoSubmit()
}

let autoSubmitGuard = false
function maybeAutoSubmit() {
  if (!isVerificationStep.value) return
  if (autoSubmitGuard || verifySubmitting.value) return
  if (otpDigits.value.some((digit) => !digit)) return
  autoSubmitGuard = true
  window.setTimeout(() => {
    autoSubmitGuard = false
    verifyCode()
  }, 80)
}

async function requestCode() {
  if (!hasValidPhoneLength.value) {
    errorMessage.value = strings.value.phoneVerificationInvalidPhone
    return
  }
  if (!canSubmitPhone.value) return
  errorMessage.value = ''
  requestSubmitting.value = true
  try {
    const response = await authStore.requestPhoneVerification({ phone_number: normalizedPhoneInput.value })
    requestedPhoneNumber.value = response.phone_number
    phoneInput.value = normalizedPhoneInput.value || response.phone_number
    otpDigits.value = ['', '', '', '', '']
    startCountdown(response.resend_available_in_seconds)
    await nextTick()
    focusOtp(0)
  } catch (error) {
    errorMessage.value = resolveAppErrorMessage(error, strings.value, language.value)
  } finally {
    requestSubmitting.value = false
  }
}

async function verifyCode() {
  if (otpValue.value.length !== otpDigits.value.length || !requestedPhoneNumber.value) return
  errorMessage.value = ''
  verifySubmitting.value = true
  try {
    await authStore.verifyPhoneNumber({
      phone_number: requestedPhoneNumber.value,
      code: otpValue.value,
    })
    stopCountdown()
    router.replace('/groups')
  } catch (error) {
    errorMessage.value = resolveAppErrorMessage(error, strings.value, language.value)
    otpDigits.value = ['', '', '', '', '']
    await nextTick()
    focusOtp(0)
  } finally {
    verifySubmitting.value = false
  }
}

async function resendCode() {
  if (!canResend.value) return
  resendSubmitting.value = true
  errorMessage.value = ''
  try {
    const response = await authStore.requestPhoneVerification({ phone_number: requestedPhoneNumber.value || normalizedPhoneInput.value })
    requestedPhoneNumber.value = response.phone_number
    otpDigits.value = ['', '', '', '', '']
    startCountdown(response.resend_available_in_seconds)
    await nextTick()
    focusOtp(0)
  } catch (error) {
    errorMessage.value = resolveAppErrorMessage(error, strings.value, language.value)
  } finally {
    resendSubmitting.value = false
  }
}

function changeNumber() {
  requestedPhoneNumber.value = ''
  otpDigits.value = ['', '', '', '', '']
  errorMessage.value = ''
  stopCountdown()
}

function signOut() {
  authStore.clearSession()
  router.replace('/auth/login')
}

onBeforeUnmount(() => {
  stopCountdown()
})
</script>

<template>
  <div class="page-shell auth-page-shell">
    <Transition name="auth-screen-fade" mode="out-in">
      <div :key="isVerificationStep ? 'code' : 'phone'" class="auth-screen">
        <!-- Phone entry -->
        <template v-if="!isVerificationStep">
          <div class="auth-icon-badge" aria-hidden="true">
            <Icon name="phone" :size="24" />
          </div>

          <div class="auth-title-row">
            <h1 class="auth-title">{{ strings.phoneVerifyPhoneTitle }}</h1>
            <span class="auth-step-pill">
              <span class="auth-step-pill__dot"></span>
              <span>{{ stepLabel(1, 2) }}</span>
            </span>
          </div>
          <p class="auth-subtitle">{{ strings.phoneVerifyPhoneSubtitle }}</p>

          <div class="auth-field">
            <label class="auth-field__label" for="phone-verify-input">{{ strings.phoneVerificationPhoneLabel }}</label>
            <input
              id="phone-verify-input"
              :value="phoneInput"
              class="auth-input"
              type="tel"
              inputmode="numeric"
              maxlength="13"
              :placeholder="strings.phoneVerificationPhonePlaceholder"
              :disabled="requestSubmitting"
              style="font-family: var(--font-en); letter-spacing: 0.02em; direction: ltr; text-align: left;"
              @input="onPhoneInput(($event.target as HTMLInputElement).value)"
            />
          </div>

          <Transition name="auth-error-transition">
            <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
              <strong>{{ strings.authErrorTitle }}</strong>
              <span>{{ errorMessage }}</span>
            </div>
          </Transition>

          <button class="auth-cta" type="button" :disabled="!canSubmitPhone" @click="requestCode">
            <span v-if="requestSubmitting" class="button-loader" aria-hidden="true"></span>
            <span>{{ requestSubmitting ? strings.phoneVerificationRequestLoading : strings.phoneVerificationRequestAction }}</span>
            <Icon v-if="!requestSubmitting" :name="isRtl ? 'arrow-left' : 'arrow-right'" :size="18" />
          </button>

          <div class="auth-spacer"></div>
          <button type="button" class="auth-link--inline" style="align-self: center;" @click="signOut">
            {{ strings.signOut }}
          </button>
        </template>

        <!-- Code entry -->
        <template v-else>
          <button class="auth-back-link" type="button" :disabled="verifySubmitting" @click="changeNumber">
            <Icon :name="isRtl ? 'arrow-right' : 'arrow-left'" :size="18" />
            {{ strings.phoneVerificationChangePhoneAction }}
          </button>

          <div class="auth-title-row">
            <h1 class="auth-title">{{ strings.phoneVerifyOtpTitle }}</h1>
            <span class="auth-step-pill auth-step-pill--accent">
              <span class="auth-step-pill__dot"></span>
              <span>{{ stepLabel(2, 2) }}</span>
            </span>
          </div>
          <p class="auth-subtitle">
            {{ strings.phoneVerifyCodeSubtitle }}
            <bdi class="num auth-phone-callout">{{ requestedPhoneNumber }}</bdi>
          </p>

          <div class="auth-otp-grid" @paste="onOtpPaste">
            <input
              v-for="(_, index) in otpDigits"
              :key="`phone-verify-digit-${index}`"
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

          <button class="auth-cta" type="button" :disabled="verifySubmitting || otpValue.length !== otpDigits.length" @click="verifyCode">
            <span v-if="verifySubmitting" class="button-loader" aria-hidden="true"></span>
            {{ verifySubmitting ? strings.phoneVerificationVerifyLoading : strings.phoneVerificationVerifyAction }}
          </button>

          <div class="auth-resend-row">
            <template v-if="countdownSeconds > 0">
              <Icon name="refresh" :size="16" />
              <span>{{ strings.resendInLabel }}</span>
              <span class="num">0:{{ String(countdownSeconds).padStart(2, '0') }}</span>
            </template>
            <button v-else type="button" :disabled="!canResend" @click="resendCode">
              <Icon name="refresh" :size="16" />
              {{ resendSubmitting ? strings.phoneVerificationResendLoading : strings.resendCodeLabel }}
            </button>
          </div>
        </template>
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

.auth-phone-callout {
  display: inline;
  direction: ltr;
  font-weight: var(--fw-semibold);
  color: var(--fg);
}

.auth-screen .auth-field { animation-delay: 60ms; }
</style>
