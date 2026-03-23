import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiClient } from '@/shared/api/client'
import type { AuthResponse, TokenPair, User } from '@/shared/api/types'
import { clearAuthStorage, readAccessToken, readRefreshToken, readStoredUser, writeAccessToken, writeRefreshToken, writeStoredUser } from '@/shared/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(readAccessToken())
  const refreshToken = ref<string | null>(readRefreshToken())
  const user = ref<User | null>(readStoredUser())
  const bootstrapped = ref(false)
  const isSubmitting = ref(false)

  const isAuthenticated = computed(() => Boolean(accessToken.value && refreshToken.value && user.value))

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
    accessToken.value = null
    refreshToken.value = null
    setUser(null)
    clearAuthStorage()
  }

  const api = new ApiClient({
    getAccessToken: () => accessToken.value,
    getRefreshToken: () => refreshToken.value,
    onTokens: setTokens,
    onUnauthorized: clearSession,
  })

  async function bootstrap() {
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

  return {
    api,
    accessToken,
    refreshToken,
    user,
    bootstrapped,
    isSubmitting,
    isAuthenticated,
    bootstrap,
    login,
    register,
    fetchMe,
    clearSession,
    setTokens,
    setUser,
  }
})
