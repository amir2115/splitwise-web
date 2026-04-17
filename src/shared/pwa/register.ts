import { registerSW } from 'virtual:pwa-register'

const RELOAD_FLAG_KEY = 'pwa-reload-in-progress'
const RELOAD_FLAG_TTL_MS = 15_000

function hasRecentReloadFlag() {
  try {
    const stored = window.sessionStorage.getItem(RELOAD_FLAG_KEY)
    if (!stored) return false
    const timestamp = Number(stored)
    if (!Number.isFinite(timestamp)) {
      window.sessionStorage.removeItem(RELOAD_FLAG_KEY)
      return false
    }
    if (Date.now() - timestamp > RELOAD_FLAG_TTL_MS) {
      window.sessionStorage.removeItem(RELOAD_FLAG_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

function markReloadFlag() {
  try {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()))
  } catch {
    // Ignore storage failures and still attempt a reload.
  }
}

function clearReloadFlag() {
  try {
    window.sessionStorage.removeItem(RELOAD_FLAG_KEY)
  } catch {
    // Ignore storage failures.
  }
}

function reloadForUpdate() {
  if (hasRecentReloadFlag()) return
  markReloadFlag()
  window.location.reload()
}

export function attachPwaUpdateListeners(
  registration: ServiceWorkerRegistration | undefined,
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>,
) {
  if (!registration) return

  const triggerUpdateCheck = () => {
    void registration.update().catch((error) => {
      console.warn('PWA update check failed', error)
    })
  }

  const triggerImmediateUpdate = () => {
    void updateServiceWorker(true).catch((error) => {
      console.warn('PWA update activation failed', error)
      reloadForUpdate()
    })
  }

  window.addEventListener('focus', triggerUpdateCheck)
  window.addEventListener('online', triggerUpdateCheck)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') triggerUpdateCheck()
  })

  if (registration.waiting) triggerImmediateUpdate()

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing
    if (!installingWorker) return
    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        triggerImmediateUpdate()
      }
    })
  })
}

export function registerPwa() {
  if (import.meta.env.DEV) return

  clearReloadFlag()

  let hasReloadedForController = false
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (hasReloadedForController) return
    hasReloadedForController = true
    reloadForUpdate()
  })

  let updateServiceWorker: (reloadPage?: boolean) => Promise<void> = async () => undefined

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateServiceWorker(true).catch((error) => {
        console.warn('PWA refresh failed', error)
        reloadForUpdate()
      })
    },
    onOfflineReady() {
      clearReloadFlag()
    },
    onRegisteredSW(_, registration) {
      attachPwaUpdateListeners(registration, updateServiceWorker)
    },
    onRegisterError(error) {
      console.error('PWA registration failed', error)
      clearReloadFlag()
    },
  })
}
