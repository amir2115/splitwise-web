import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '@/shared/api/client'

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('refreshes once and retries the request after 401', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'expired' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const onTokens = vi.fn()
    const onUnauthorized = vi.fn()

    const client = new ApiClient({
      getAccessToken: () => 'old-access',
      getRefreshToken: () => 'old-refresh',
      onTokens,
      onUnauthorized,
    })

    const result = await client.get<{ ok: boolean }>('/groups')

    expect(result.ok).toBe(true)
    expect(onTokens).toHaveBeenCalledWith({ access_token: 'new-access', refresh_token: 'new-refresh' })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
