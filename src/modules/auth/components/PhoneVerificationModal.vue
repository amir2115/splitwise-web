<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import BaseModal from '@/shared/components/BaseModal.vue'
import InlineAlert from '@/shared/components/InlineAlert.vue'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { fillOtpDigitsFromInput, mergeOtpDigits, normalizeOtpDigit, normalizePhoneInput } from '@/modules/auth/phoneVerification'
import { resolveAppErrorMessage } from '@/shared/utils/apiErrors'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { strings, language } = storeToRefs(settingsStore)

const phoneInput = ref('')
const requestedPhoneNumber = ref('')
const otpDigits = ref(['', '', '', '', ''])
const otpRefs = ref<Array<HTMLInputElement | null>>([])
const countdownSeconds = ref(0)
const isRequestSubmitting = ref(false)
const isVerifySubmitting = ref(false)
const isResendSubmitting = ref(false)
const requestError = ref('')
const verifyError = ref('')
const infoMessage = ref('')
let countdownTimer: number | null = null

const isVerificationStep = computed(() => Boolean(requestedPhoneNumber.value))
const verificationCode = computed(() => mergeOtpDigits(otpDigits.value))
const normalizedPhoneInput = computed(() => normalizePhoneInput(phoneInput.value))
const normalizedPhoneDigits = computed(() => normalizedPhoneInput.value.replace(/^\+/, ''))
const hasValidPhoneLength = computed(() => normalizedPhoneDigits.value.length === 11 || normalizedPhoneDigits.value.length === 12)
const canSubmitPhone = computed(() => hasValidPhoneLength.value && !isRequestSubmitting.value)
const canSubmitCode = computed(() => verificationCode.value.length === otpDigits.value.length && !isVerifySubmitting.value)
const canResend = computed(() => countdownSeconds.value <= 0 && !isResendSubmitting.value && !isRequestSubmitting.value)
const modalSubtitle = computed(() => (isVerificationStep.value ? '' : strings.value.phoneVerificationSubtitle))

function resetOtpInputs() {
  otpDigits.value = ['', '', '', '', '']
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

function setOtpRef(index: number, element: Element | null) {
  otpRefs.value[index] = element instanceof HTMLInputElement ? element : null
}

function focusOtp(index: number) {
  const target = otpRefs.value[index]
  if (!target) return
  target.focus()
  target.select()
}

function onPhoneInput(value: string) {
  phoneInput.value = normalizePhoneInput(value)
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
  const lastFilledIndex = digits.reduce((lastIndex, digit, index) => (digit ? index : lastIndex), 0)
  focusOtp(lastFilledIndex)
}

async function requestCode() {
  if (!hasValidPhoneLength.value) {
    requestError.value = strings.value.phoneVerificationInvalidPhone
    return
  }
  if (!canSubmitPhone.value) return
  requestError.value = ''
  verifyError.value = ''
  infoMessage.value = ''
  isRequestSubmitting.value = true
  try {
    const response = await authStore.requestPhoneVerification({ phone_number: normalizedPhoneInput.value })
    requestedPhoneNumber.value = response.phone_number
    phoneInput.value = normalizedPhoneInput.value || response.phone_number
    resetOtpInputs()
    startCountdown(response.resend_available_in_seconds)
    await nextTick()
    focusOtp(0)
  } catch (error) {
    requestError.value = resolveAppErrorMessage(error, strings.value, language.value)
  } finally {
    isRequestSubmitting.value = false
  }
}

async function verifyCode() {
  if (!canSubmitCode.value || !requestedPhoneNumber.value) return
  verifyError.value = ''
  isVerifySubmitting.value = true
  try {
    await authStore.verifyPhoneNumber({
      phone_number: requestedPhoneNumber.value,
      code: verificationCode.value,
    })
    stopCountdown()
  } catch (error) {
    verifyError.value = resolveAppErrorMessage(error, strings.value, language.value)
  } finally {
    isVerifySubmitting.value = false
  }
}

async function resendCode() {
  if (!canResend.value) return
  isResendSubmitting.value = true
  requestError.value = ''
  verifyError.value = ''
  infoMessage.value = ''
  try {
    const response = await authStore.requestPhoneVerification({ phone_number: requestedPhoneNumber.value || phoneInput.value })
    requestedPhoneNumber.value = response.phone_number
    resetOtpInputs()
    startCountdown(response.resend_available_in_seconds)
    await nextTick()
    focusOtp(0)
  } catch (error) {
    verifyError.value = resolveAppErrorMessage(error, strings.value, language.value)
  } finally {
    isResendSubmitting.value = false
  }
}

function resetToPhoneStep() {
  requestedPhoneNumber.value = ''
  requestError.value = ''
  verifyError.value = ''
  infoMessage.value = ''
  resetOtpInputs()
  stopCountdown()
}

watch(
  () => authStore.requiresPhoneVerification,
  async (required) => {
    if (required) {
      phoneInput.value = authStore.user?.phone_number ?? ''
      await nextTick()
      return
    }
    requestedPhoneNumber.value = ''
    phoneInput.value = authStore.user?.phone_number ?? ''
    requestError.value = ''
    verifyError.value = ''
    infoMessage.value = ''
    resetOtpInputs()
    stopCountdown()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopCountdown()
})
</script>

<template>
  <BaseModal :title="strings.phoneVerificationTitle" :dismissible="false">
    <p v-if="modalSubtitle" class="muted phone-verification-modal__subtitle">{{ modalSubtitle }}</p>

    <template v-if="!isVerificationStep">
      <div class="form-field">
        <label class="form-field__label" for="phone-verification-input">{{ strings.phoneVerificationPhoneLabel }}</label>
        <input
          id="phone-verification-input"
          :value="phoneInput"
          class="text-input"
          type="text"
          inputmode="numeric"
          maxlength="13"
          :placeholder="strings.phoneVerificationPhonePlaceholder"
          @input="onPhoneInput(($event.target as HTMLInputElement).value)"
        />
      </div>

      <InlineAlert v-if="requestError" :message="requestError" />

      <button class="filled-button phone-verification-modal__button" type="button" :disabled="!canSubmitPhone" @click="requestCode">
        {{ isRequestSubmitting ? strings.phoneVerificationRequestLoading : strings.phoneVerificationRequestAction }}
      </button>
    </template>

    <template v-else>
      <div class="form-field">
        <label class="form-field__label">{{ strings.phoneVerificationCodeLabel }}</label>
        <div class="phone-verification-modal__otp" @paste="onOtpPaste">
          <input
            v-for="(_, index) in otpDigits"
            :key="`phone-verification-digit-${index}`"
            :ref="(element) => setOtpRef(index, element)"
            :value="otpDigits[index]"
            class="text-input phone-verification-modal__otp-input"
            type="text"
            inputmode="numeric"
            maxlength="1"
            @input="onOtpInput(index, ($event.target as HTMLInputElement).value)"
            @keydown="onOtpKeydown(index, $event)"
          />
        </div>
      </div>

      <InlineAlert v-if="verifyError" :message="verifyError" />

      <div class="phone-verification-modal__actions">
        <button class="filled-button phone-verification-modal__action-button" type="button" :disabled="!canSubmitCode" @click="verifyCode">
          {{ isVerifySubmitting ? strings.phoneVerificationVerifyLoading : strings.phoneVerificationVerifyAction }}
        </button>
        <button class="outline-button phone-verification-modal__action-button" type="button" :disabled="isVerifySubmitting || isResendSubmitting" @click="resetToPhoneStep">
          {{ strings.phoneVerificationChangePhoneAction }}
        </button>
      </div>

      <button class="outline-button phone-verification-modal__button phone-verification-modal__resend" type="button" :disabled="!canResend" @click="resendCode">
        {{
          isResendSubmitting
            ? strings.phoneVerificationResendLoading
            : countdownSeconds > 0
              ? strings.phoneVerificationResendCountdown.replace('{seconds}', String(countdownSeconds))
              : strings.phoneVerificationResendAction
        }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.phone-verification-modal__subtitle {
  margin: 0;
}

.phone-verification-modal__button {
  width: 100%;
  min-height: 48px;
}

.phone-verification-modal__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.phone-verification-modal__action-button,
.phone-verification-modal__resend {
  font: inherit;
}

.phone-verification-modal__otp {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  direction: ltr;
}

.phone-verification-modal__otp-input {
  text-align: center;
  font-size: 20px;
  line-height: 28px;
  font-weight: 700;
}

@media (max-width: 520px) {
  .phone-verification-modal__actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
