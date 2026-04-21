import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiClient } from '@/shared/api/client'
import type {
  AuthResponse,
  ChangePasswordRequest,
  InvitedAccountCompleteRequest,
  InvitedAccountRequest,
  InvitedAccountRequestResponse,
  InvitedAccountVerifyPhoneRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  PasswordResetVerifyRequest,
  PasswordResetVerifyResponse,
  PhoneVerificationConfirmRequest,
  PhoneVerificationRequest,
  PhoneVerificationRequestResponse,
  RegisterRequest,
  RegisterRequestResponse,
  RegisterResendRequest,
  RegisterVerifyRequest,
  TokenPair,
  User,
  UserCreateByInviterRequest,
} from '@/shared/api/types'
import { env } from '@/shared/config/env'
import {
  clearAuthStorage,
  readAccessToken,
  readGuestMode,
  readRefreshToken,
  readStoredUser,
  writeAccessToken,
  writeGuestMode,
  writeRefreshToken,
  writeStoredUser,
} from '@/shared/utils/storage'
import { resetSessionData } from '@/shared/stores/sessionData'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(readAccessToken())
  const refreshToken = ref<string | null>(readRefreshToken())
  const user = ref<User | null>(readStoredUser())
  const isGuestMode = ref(readGuestMode())
  const bootstrapped = ref(false)
  const isSubmitting = ref(false)

  const isAuthenticated = computed(() => Boolean(accessToken.value && refreshToken.value && user.value))
  const hasActiveSession = computed(() => isAuthenticated.value || isGuestMode.value)
  const requiresPasswordChange = computed(() => Boolean(user.value?.must_change_password))
  const requiresPhoneVerification = computed(
    () => env.phoneVerificationRequired && isAuthenticated.value && !isGuestMode.value && (!user.value?.phone_number || !user.value?.is_phone_verified),
  )

  function setTokens(tokens: Pick<TokenPair, 'access_token' | 'refresh_token'>) {
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    writeAccessToken(tokens.access_token)
    writeRefreshToken(tokens.refresh_token)
  }

  function setUser(nextUser: User | null) {
    user.value = nextUser
    writeStoredUser(nextUser)
  }

  function clearSession() {
    resetSessionData()
    accessToken.value = null
    refreshToken.value = null
    isGuestMode.value = false
    setUser(null)
    clearAuthStorage()
  }

  function continueOffline() {
    resetSessionData()
    accessToken.value = null
    refreshToken.value = null
    setUser(null)
    isGuestMode.value = true
    writeAccessToken(null)
    writeRefreshToken(null)
    writeStoredUser(null)
    writeGuestMode(true)
  }

  function stopGuestMode() {
    isGuestMode.value = false
    writeGuestMode(false)
  }

  const api = new ApiClient({
    getAccessToken: () => accessToken.value,
    getRefreshToken: () => refreshToken.value,
    onTokens: setTokens,
    onUnauthorized: clearSession,
  })

  async function bootstrap() {
    if (isGuestMode.value) {
      bootstrapped.value = true
      return
    }

    if (!refreshToken.value) {
      bootstrapped.value = true
      return
    }

    try {
      if (!accessToken.value) {
        const tokens = await api.post<TokenPair>('/auth/refresh', { refresh_token: refreshToken.value })
        setTokens(tokens)
      }
      const me = await api.get<User>('/auth/me')
      setUser(me)
    } catch {
      clearSession()
    } finally {
      bootstrapped.value = true
    }
  }

  async function login(payload: { username: string; password: string }) {
    isSubmitting.value = true
    try {
      const response = await api.post<AuthResponse>('/auth/login', payload)
      resetSessionData()
      stopGuestMode()
      setTokens(response.tokens)
      setUser(response.user)
      return response
    } finally {
      isSubmitting.value = false
    }
  }

  async function register(payload: { name: string; username: string; password: string }) {
    isSubmitting.value = true
    try {
      const response = await api.post<AuthResponse>('/auth/register', payload)
      resetSessionData()
      stopGuestMode()
      setTokens(response.tokens)
      setUser(response.user)
      return response
    } finally {
      isSubmitting.value = false
    }
  }

  async function requestRegister(payload: RegisterRequest) {
    isSubmitting.value = true
    try {
      return await api.post<RegisterRequestResponse>('/auth/register/request', payload)
    } finally {
      isSubmitting.value = false
    }
  }

  async function verifyRegister(payload: RegisterVerifyRequest) {
    isSubmitting.value = true
    try {
      const response = await api.post<AuthResponse>('/auth/register/verify', payload)
      resetSessionData()
      stopGuestMode()
      setTokens(response.tokens)
      setUser(response.user)
      return response
    } finally {
      isSubmitting.value = false
    }
  }

  async function resendRegisterCode(payload: RegisterResendRequest) {
    return api.post<RegisterRequestResponse>('/auth/register/resend', payload)
  }

  async function fetchMe() {
    const me = await api.get<User>('/auth/me')
    setUser(me)
    return me
  }

  async function createUserByInviter(payload: UserCreateByInviterRequest) {
    return api.post<User>('/auth/users', payload)
  }

  async function changePassword(payload: ChangePasswordRequest) {
    isSubmitting.value = true
    try {
      const updatedUser = await api.post<User>('/auth/change-password', payload)
      setUser(updatedUser)
      return updatedUser
    } finally {
      isSubmitting.value = false
    }
  }

  async function requestPhoneVerification(payload: PhoneVerificationRequest) {
    return api.post<PhoneVerificationRequestResponse>('/auth/phone/request-verification', payload)
  }

  async function verifyPhoneNumber(payload: PhoneVerificationConfirmRequest) {
    const updatedUser = await api.post<User>('/auth/phone/verify', payload)
    setUser(updatedUser)
    return updatedUser
  }

  async function requestPasswordReset(payload: PasswordResetRequest) {
    return api.post<PasswordResetRequestResponse>('/auth/forgot-password/request', payload)
  }

  async function verifyPasswordResetCode(payload: PasswordResetVerifyRequest) {
    return api.post<PasswordResetVerifyResponse>('/auth/forgot-password/verify', payload)
  }

  async function confirmPasswordReset(payload: PasswordResetConfirmRequest) {
    isSubmitting.value = true
    try {
      clearSession()
      const response = await api.post<AuthResponse>('/auth/forgot-password/confirm', payload)
      resetSessionData()
      stopGuestMode()
      setTokens(response.tokens)
      setUser(response.user)
      return response
    } finally {
      isSubmitting.value = false
    }
  }

  async function requestInvitedAccount(payload: InvitedAccountRequest) {
    return api.post<InvitedAccountRequestResponse>('/auth/invited-account/request', payload)
  }

  async function verifyInvitedAccountPhone(payload: InvitedAccountVerifyPhoneRequest) {
    const updatedUser = await api.post<User>('/auth/invited-account/verify-phone', payload)
    return updatedUser
  }

  async function completeInvitedAccount(payload: InvitedAccountCompleteRequest) {
    isSubmitting.value = true
    try {
      clearSession()
      const response = await api.post<AuthResponse>('/auth/invited-account/complete', payload)
      resetSessionData()
      stopGuestMode()
      setTokens(response.tokens)
      setUser(response.user)
      return response
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    api,
    accessToken,
    refreshToken,
    user,
    bootstrapped,
    isSubmitting,
    isGuestMode,
    isAuthenticated,
    hasActiveSession,
    requiresPasswordChange,
    requiresPhoneVerification,
    bootstrap,
    login,
    register,
    requestRegister,
    verifyRegister,
    resendRegisterCode,
    fetchMe,
    createUserByInviter,
    changePassword,
    requestPhoneVerification,
    verifyPhoneNumber,
    requestPasswordReset,
    verifyPasswordResetCode,
    confirmPasswordReset,
    requestInvitedAccount,
    verifyInvitedAccountPhone,
    completeInvitedAccount,
    clearSession,
    continueOffline,
    stopGuestMode,
    setTokens,
    setUser,
  }
})
