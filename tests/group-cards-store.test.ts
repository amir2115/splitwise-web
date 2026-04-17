import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useGroupCardsStore } from '@/modules/groupCards/store'

describe('group cards store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    setActivePinia(createPinia())
    const authStore = useAuthStore()
    authStore.setTokens({ access_token: 'access', refresh_token: 'refresh' })
  })

  it('loads cards for a group', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: 'card-1',
              group_id: 'group-1',
              member_id: 'member-1',
              card_number: '6037991899754321',
              user_id: 'user-1',
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
              deleted_at: null,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const store = useGroupCardsStore()
    await store.load('group-1')

    expect(store.byGroupId['group-1']?.[0]?.card_number).toBe('6037991899754321')
  })

  it('normalizes card numbers before save and updates local state', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'card-1',
          group_id: 'group-1',
          member_id: 'member-1',
          card_number: '5022291073779999',
          user_id: 'user-1',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          deleted_at: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useGroupCardsStore()
    const saved = await store.save({
      existingId: 'card-1',
      group_id: 'group-1',
      member_id: 'member-1',
      card_number: '۵۰۲۲ ۲۹۱۰ ۷۳۷۷ ۹۹۹۹',
    })

    expect(saved.card_number).toBe('5022291073779999')
    expect(store.byGroupId['group-1']?.[0]?.card_number).toBe('5022291073779999')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('5022291073779999')
  })

  it('removes cards from local state after delete', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const store = useGroupCardsStore()
    store.byGroupId['group-1'] = [
      {
        id: 'card-1',
        group_id: 'group-1',
        member_id: 'member-1',
        card_number: '6037991899754321',
        user_id: 'user-1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
    ]

    await store.remove(store.byGroupId['group-1'][0]!)

    expect(store.byGroupId['group-1']).toEqual([])
  })
})
