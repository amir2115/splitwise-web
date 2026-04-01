import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'

describe('auth store guest mode', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    setActivePinia(createPinia())
  })

  it('continues offline without tokens and survives bootstrap', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const store = useAuthStore()
    store.continueOffline()

    expect(store.isGuestMode).toBe(true)
    expect(store.hasActiveSession).toBe(true)
    expect(store.isAuthenticated).toBe(false)

    await store.bootstrap()

    expect(store.bootstrapped).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
