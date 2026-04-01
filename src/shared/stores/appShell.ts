import { ref } from 'vue'
import { defineStore } from 'pinia'
import { env } from '@/shared/config/env'
import type { AppUpdateState, HealthResponse } from '@/shared/api/types'
import { resolveWebUpdateState } from '@/shared/utils/update'

const emptyUpdateState: AppUpdateState = {
  mode: 'NONE',
  storeUrl: null,
  title: null,
  message: null,
  isVisible: false,
}

export const useAppShellStore = defineStore('appShell', () => {
  const hasInternet = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
  const isApiReachable = ref(false)
  const lastHealthWasSuccessful = ref(false)
  const isCheckingHealth = ref(false)
  const lastCheckedAt = ref<number | null>(null)
  const healthError = ref<string | null>(null)
  const updateState = ref<AppUpdateState>(emptyUpdateState)
  const initialized = ref(false)

  async function refreshConnectionStatus() {
    hasInternet.value = typeof navigator === 'undefined' ? true : navigator.onLine
    isCheckingHealth.value = true
    healthError.value = null
    try {
      const response = await fetch(`${env.apiBaseUrl}/health`)
      if (!response.ok) throw new Error(`Health check failed with ${response.status}`)
      const payload = (await response.json()) as HealthResponse
      isApiReachable.value = true
      lastHealthWasSuccessful.value = payload.status === 'ok'
      updateState.value = resolveWebUpdateState(env.appVersionCode, payload)
    } catch (error) {
      isApiReachable.value = false
      lastHealthWasSuccessful.value = false
      healthError.value = error instanceof Error ? error.message : 'Health check failed'
    } finally {
      lastCheckedAt.value = Date.now()
      isCheckingHealth.value = false
    }
  }

  function dismissSoftUpdate() {
    if (updateState.value.mode === 'SOFT') {
      updateState.value = emptyUpdateState
    }
  }

  function initialize() {
    if (initialized.value) return
    initialized.value = true
    window.addEventListener('online', refreshConnectionStatus)
    window.addEventListener('offline', refreshConnectionStatus)
    void refreshConnectionStatus()
  }

  return {
    hasInternet,
    isApiReachable,
    lastHealthWasSuccessful,
    isCheckingHealth,
    lastCheckedAt,
    healthError,
    updateState,
    initialize,
    refreshConnectionStatus,
    dismissSoftUpdate,
  }
})
