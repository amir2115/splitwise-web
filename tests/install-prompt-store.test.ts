import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInstallPromptStore } from '@/shared/stores/installPrompt'

describe('install prompt store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    setActivePinia(createPinia())
  })

  it('initializes without crashing when MediaQueryList.addEventListener is unavailable', () => {
    const addListener = vi.fn()
    const matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addListener,
    })

    vi.stubGlobal('window', Object.assign(window, { matchMedia }))

    const store = useInstallPromptStore()

    expect(() => store.initialize()).not.toThrow()
    expect(addListener).toHaveBeenCalledTimes(1)
    expect(store.isStandalone).toBe(false)
  })
})
