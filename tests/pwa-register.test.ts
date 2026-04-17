import { beforeEach, describe, expect, it, vi } from 'vitest'
import { attachPwaUpdateListeners } from '@/shared/pwa/register'

describe('attachPwaUpdateListeners', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('activates a waiting service worker and checks for updates on app resume', () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined)
    const registration = {
      waiting: {},
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
    } as unknown as ServiceWorkerRegistration

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: { state: 'activated' },
      },
    })

    attachPwaUpdateListeners(registration, updateServiceWorker)

    expect(updateServiceWorker).toHaveBeenCalledWith(true)

    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('online'))
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(registration.update).toHaveBeenCalledTimes(3)
    expect(registration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function))
  })

  it('tries to activate an installed update when updatefound finishes installing', () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined)
    const stateChangeListeners: Array<() => void> = []
    const installingWorker = {
      state: 'installing',
      addEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === 'statechange') stateChangeListeners.push(callback)
      }),
    }
    const updateFoundListeners: Array<() => void> = []
    const registration = {
      waiting: null,
      installing: installingWorker,
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === 'updatefound') updateFoundListeners.push(callback)
      }),
    } as unknown as ServiceWorkerRegistration

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: { state: 'activated' },
      },
    })

    attachPwaUpdateListeners(registration, updateServiceWorker)

    updateFoundListeners[0]?.()
    installingWorker.state = 'installed'
    stateChangeListeners[0]?.()

    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })
})
