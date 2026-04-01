import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { readInstallPromptDismissedAt, writeInstallPromptDismissedAt } from '@/shared/utils/storage'

const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7

type StandaloneMediaQuery = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export const useInstallPromptStore = defineStore('installPrompt', () => {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isStandalone = ref(false)
  const isIosSafari = ref(false)
  const isMobile = ref(false)
  const dismissedAt = ref(readInstallPromptDismissedAt())
  const initialized = ref(false)

  const wasDismissedRecently = computed(() => Date.now() - dismissedAt.value < DISMISS_TTL_MS)
  const canPromptInstall = computed(() => Boolean(deferredPrompt.value) && !isStandalone.value && !wasDismissedRecently.value && isMobile.value)
  const shouldShowIosHelp = computed(() => isIosSafari.value && !isStandalone.value && !wasDismissedRecently.value && isMobile.value)
  const shouldShowPrompt = computed(() => canPromptInstall.value || shouldShowIosHelp.value)

  function getStandaloneMediaQuery(): StandaloneMediaQuery | null {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null
    }

    return window.matchMedia('(display-mode: standalone)') as StandaloneMediaQuery
  }

  function updateStandaloneState() {
    const standaloneMedia = getStandaloneMediaQuery()?.matches ?? false
    const navigatorStandalone = 'standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    isStandalone.value = standaloneMedia || navigatorStandalone
  }

  function initialize() {
    if (initialized.value || typeof window === 'undefined') return
    initialized.value = true

    const userAgent = window.navigator.userAgent
    isMobile.value = /Android|iPhone|iPad|iPod/i.test(userAgent)
    const isSafari = /Safari/i.test(userAgent) && !/CriOS|Chrome|FxiOS|EdgiOS|EdgA|OPiOS/i.test(userAgent)
    isIosSafari.value = /iPhone|iPad|iPod/i.test(userAgent) && isSafari

    updateStandaloneState()

    const standaloneMediaQuery = getStandaloneMediaQuery()
    if (standaloneMediaQuery) {
      if (typeof standaloneMediaQuery.addEventListener === 'function') {
        standaloneMediaQuery.addEventListener('change', updateStandaloneState)
      } else if (typeof standaloneMediaQuery.addListener === 'function') {
        standaloneMediaQuery.addListener(updateStandaloneState)
      }
    }

    window.addEventListener('beforeinstallprompt', ((event: Event) => {
      event.preventDefault()
      deferredPrompt.value = event as BeforeInstallPromptEvent
    }) as EventListener)

    window.addEventListener('appinstalled', () => {
      deferredPrompt.value = null
      dismissedAt.value = Date.now()
      writeInstallPromptDismissedAt(dismissedAt.value)
      updateStandaloneState()
    })
  }

  async function promptInstall() {
    if (!deferredPrompt.value) return false
    const promptEvent = deferredPrompt.value
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome !== 'accepted') {
      dismissPrompt()
      return false
    }
    deferredPrompt.value = null
    return true
  }

  function dismissPrompt() {
    dismissedAt.value = Date.now()
    writeInstallPromptDismissedAt(dismissedAt.value)
  }

  return {
    initialize,
    isStandalone,
    isIosSafari,
    isMobile,
    canPromptInstall,
    shouldShowIosHelp,
    shouldShowPrompt,
    promptInstall,
    dismissPrompt,
  }
})
