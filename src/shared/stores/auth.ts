import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiClient } from '@/shared/api/client'
import type { AuthResponse, ChangePasswordRequest, TokenPair, User, UserCreateByInviterRequest } from '@/shared/api/types'
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
    bootstrap,
    login,
    register,
    fetchMe,
    createUserByInviter,
    changePassword,
    clearSession,
    continueOffline,
    stopGuestMode,
    setTokens,
    setUser,
  }
})
