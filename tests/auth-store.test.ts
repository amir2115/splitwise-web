import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useGroupsStore } from '@/modules/groups/store'
import { env } from '@/shared/config/env'

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('auth store guest mode', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    setActivePinia(createPinia())
    env.phoneVerificationRequired = false
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

  it('clears in-memory app data on sign out', () => {
    const authStore = useAuthStore()
    const groupsStore = useGroupsStore()

    groupsStore.groups = [
      {
        id: 'group-1',
        name: 'Old Group',
        user_id: 'user-1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
    ]
    groupsStore.hasLoaded = true
    authStore.setTokens({ access_token: 'access-1', refresh_token: 'refresh-1' })

    authStore.clearSession()

    expect(groupsStore.groups).toEqual([])
    expect(groupsStore.hasLoaded).toBe(false)
    expect(authStore.accessToken).toBe(null)
    expect(authStore.refreshToken).toBe(null)
  })

  it('clears previous account data before storing a new login session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
      jsonResponse({
          user: {
            id: 'user-2',
            name: 'User Two',
            username: 'user-two',
            phone_number: null,
            is_phone_verified: false,
            must_change_password: true,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          tokens: {
            access_token: 'access-2',
            refresh_token: 'refresh-2',
            token_type: 'Bearer',
          },
        }),
      ),
    )

    const authStore = useAuthStore()
    const groupsStore = useGroupsStore()

    groupsStore.groups = [
      {
        id: 'group-1',
        name: 'Old Group',
        user_id: 'user-1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
    ]
    groupsStore.hasLoaded = true

    await authStore.login({ username: 'user-two', password: 'secret' })

    expect(groupsStore.groups).toEqual([])
    expect(groupsStore.hasLoaded).toBe(false)
    expect(authStore.user?.id).toBe('user-2')
    expect(authStore.requiresPasswordChange).toBe(true)
    expect(authStore.accessToken).toBe('access-2')
    expect(authStore.refreshToken).toBe('refresh-2')
  })

  it('updates must_change_password after changing password', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 'user-1',
          name: 'User One',
          username: 'user-one',
          phone_number: null,
          is_phone_verified: false,
          must_change_password: false,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        }),
      ),
    )

    const authStore = useAuthStore()
    authStore.setTokens({ access_token: 'access-1', refresh_token: 'refresh-1' })
    authStore.setUser({
      id: 'user-1',
      name: 'User One',
      username: 'user-one',
      phone_number: null,
      is_phone_verified: false,
      must_change_password: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    await authStore.changePassword({ current_password: '12345678', new_password: 'password123' })

    expect(authStore.requiresPasswordChange).toBe(false)
    expect(authStore.user?.must_change_password).toBe(false)
  })

  it('requires phone verification for authenticated users without a phone number or with an unverified phone when the env flag is enabled', () => {
    env.phoneVerificationRequired = true

    const authStore = useAuthStore()
    authStore.setTokens({ access_token: 'access-1', refresh_token: 'refresh-1' })
    authStore.setUser({
      id: 'user-1',
      name: 'User One',
      username: 'user-one',
      phone_number: null,
      is_phone_verified: false,
      must_change_password: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    expect(authStore.requiresPhoneVerification).toBe(true)

    authStore.setUser({
      id: 'user-1',
      name: 'User One',
      username: 'user-one',
      phone_number: '989120000000',
      is_phone_verified: false,
      must_change_password: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    expect(authStore.requiresPhoneVerification).toBe(true)

    authStore.setUser({
      id: 'user-1',
      name: 'User One',
      username: 'user-one',
      phone_number: '989120000000',
      is_phone_verified: true,
      must_change_password: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    expect(authStore.requiresPhoneVerification).toBe(false)
  })

  it('requests and verifies the phone number through the auth api and updates the stored user', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            phone_number: '989120000000',
            expires_in_seconds: 120,
            resend_available_in_seconds: 60,
            message_id: 44,
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            id: 'user-1',
            name: 'User One',
            username: 'user-one',
            phone_number: '989120000000',
            is_phone_verified: true,
            must_change_password: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }),
        ),
    )

    const authStore = useAuthStore()
    authStore.setTokens({ access_token: 'access-1', refresh_token: 'refresh-1' })
    authStore.setUser({
      id: 'user-1',
      name: 'User One',
      username: 'user-one',
      phone_number: null,
      is_phone_verified: false,
      must_change_password: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    const request = await authStore.requestPhoneVerification({ phone_number: '09120000000' })
    const verified = await authStore.verifyPhoneNumber({ phone_number: '989120000000', code: '12345' })

    expect(request.phone_number).toBe('989120000000')
    expect(verified.phone_number).toBe('989120000000')
    expect(authStore.user?.phone_number).toBe('989120000000')
    expect(authStore.user?.is_phone_verified).toBe(true)
  })

  it('completes forgot password confirmation and signs the user in', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            masked_phone_number: '98912***000',
            expires_in_seconds: 120,
            resend_available_in_seconds: 60,
            message_id: 10,
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ reset_token: 'reset-token-1' }))
        .mockResolvedValueOnce(
          jsonResponse({
            user: {
              id: 'user-1',
              name: 'User One',
              username: 'user-one',
              phone_number: '989120000000',
              is_phone_verified: true,
              must_change_password: false,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
            tokens: {
              access_token: 'access-1',
              refresh_token: 'refresh-1',
              token_type: 'Bearer',
            },
          }),
        ),
    )

    const authStore = useAuthStore()

    const request = await authStore.requestPasswordReset({ identifier: 'user-one' })
    const verify = await authStore.verifyPasswordResetCode({ identifier: 'user-one', code: '12345' })
    const confirm = await authStore.confirmPasswordReset({ reset_token: verify.reset_token, new_password: 'password1234' })

    expect(request.masked_phone_number).toBe('98912***000')
    expect(confirm.user.username).toBe('user-one')
    expect(authStore.user?.username).toBe('user-one')
    expect(authStore.accessToken).toBe('access-1')
  })
})
