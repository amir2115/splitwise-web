import { registerSW } from 'virtual:pwa-register'

export function registerPwa() {
  if (import.meta.env.DEV) return

  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.error('PWA registration failed', error)
    },
  })
}
