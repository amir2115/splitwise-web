import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PhoneVerificationModal from '@/modules/auth/components/PhoneVerificationModal.vue'
import { fillOtpDigitsFromInput, mergeOtpDigits, normalizeOtpDigit, normalizePhoneCandidate, normalizePhoneInput } from '@/modules/auth/phoneVerification'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { env } from '@/shared/config/env'

describe('phone verification helpers', () => {
  it('normalizes phone input and otp digits', () => {
    expect(normalizePhoneInput('۰۹۱۲-۰۰۰ ۰۰۰۰')).toBe('09120000000')
    expect(normalizePhoneCandidate('۰۹۱۲-۰۰۰ ۰۰۰۰')).toBe('09120000000')
    expect(normalizePhoneCandidate('amir2115')).toBe('amir2115')
    expect(normalizePhoneCandidate('@amir2115')).toBe('@amir2115')
    expect(normalizeOtpDigit('۵')).toBe('5')
    expect(fillOtpDigitsFromInput('۱۲۳۴۵')).toEqual(['1', '2', '3', '4', '5'])
    expect(mergeOtpDigits(['۱', '2', '۳', '4', '۵'])).toBe('12345')
  })
})

describe('PhoneVerificationModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    env.phoneVerificationRequired = true
    setActivePinia(createPinia())
  })

  it('requests a code and pastes otp digits across the inputs', async () => {
    const authStore = useAuthStore()
    const settingsStore = useSettingsStore()
    settingsStore.setLanguage('en')
    authStore.setTokens({ access_token: 'access-1', refresh_token: 'refresh-1' })
    authStore.setUser({
      id: 'user-1',
      name: 'User One',
      username: 'user-one',
      phone_number: null,
      must_change_password: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    vi.spyOn(authStore, 'requestPhoneVerification').mockResolvedValue({
      phone_number: '989120000000',
      expires_in_seconds: 120,
      resend_available_in_seconds: 60,
      message_id: 44,
    })

    const wrapper = mount(PhoneVerificationModal)

    await wrapper.get('#phone-verification-input').setValue('09120000000')
    await wrapper.get('button.filled-button').trigger('click')

    expect(authStore.requestPhoneVerification).toHaveBeenCalledWith({ phone_number: '09120000000' })
    expect(wrapper.text()).toContain('The verification code has been sent.')

    const otpContainer = wrapper.get('.phone-verification-modal__otp')
    await otpContainer.trigger('paste', {
      clipboardData: {
        getData: () => '12345',
      },
    })

    const otpInputs = wrapper.findAll('.phone-verification-modal__otp-input')
    expect(otpInputs.map((input) => (input.element as HTMLInputElement).value)).toEqual(['1', '2', '3', '4', '5'])
    expect(wrapper.get('.phone-verification-modal__resend').attributes('disabled')).toBeDefined()
  })

  it('clears the current otp digit on backspace and verifies with the merged code', async () => {
    const authStore = useAuthStore()
    authStore.setTokens({ access_token: 'access-1', refresh_token: 'refresh-1' })
    authStore.setUser({
      id: 'user-1',
      name: 'User One',
      username: 'user-one',
      phone_number: null,
      must_change_password: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    vi.spyOn(authStore, 'requestPhoneVerification').mockResolvedValue({
      phone_number: '989120000000',
      expires_in_seconds: 120,
      resend_available_in_seconds: 2,
      message_id: 44,
    })
    vi.spyOn(authStore, 'verifyPhoneNumber').mockImplementation(async (payload) => {
      const updatedUser = {
        id: 'user-1',
        name: 'User One',
        username: 'user-one',
        phone_number: '989120000000',
        must_change_password: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      }
      authStore.setUser(updatedUser)
      return Promise.resolve(updatedUser)
    })

    const wrapper = mount(PhoneVerificationModal)
    await wrapper.get('#phone-verification-input').setValue('09120000000')
    await wrapper.get('button.filled-button').trigger('click')

    const otpInputs = wrapper.findAll('.phone-verification-modal__otp-input')
    await otpInputs[0].setValue('1')
    await otpInputs[1].setValue('2')
    await otpInputs[1].trigger('keydown', { key: 'Backspace' })
    expect((otpInputs[1].element as HTMLInputElement).value).toBe('')

    await otpInputs[1].setValue('2')
    await otpInputs[2].setValue('3')
    await otpInputs[3].setValue('4')
    await otpInputs[4].setValue('5')

    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.phone-verification-modal__resend').attributes('disabled')).toBeUndefined()

    await wrapper.get('.phone-verification-modal__action-button.filled-button').trigger('click')

    expect(authStore.verifyPhoneNumber).toHaveBeenCalledWith({ phone_number: '989120000000', code: '12345' })
  })
})
