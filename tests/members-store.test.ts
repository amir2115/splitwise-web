import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useMembersStore } from '@/modules/members/store'

describe('members store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    setActivePinia(createPinia())
    const authStore = useAuthStore()
    authStore.setTokens({ access_token: 'access', refresh_token: 'refresh' })
  })

  it('loads member suggestions for the target group', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'user-1',
            username: 'alice',
            name: 'Alice',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useMembersStore()
    const results = await store.searchSuggestions('group-1', 'alice')

    expect(results).toEqual([{ id: 'user-1', username: 'alice', name: 'Alice' }])
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/members/suggestions?group_id=group-1&query=alice&limit=8')
  })

  it('saves a selected username through the existing create flow and refreshes members', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            outcome: 'invite_sent',
            member: {
              id: 'member-1',
              group_id: 'group-1',
              username: 'alice',
              membership_status: 'PENDING_INVITE',
              is_archived: false,
              user_id: 'user-1',
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
              deleted_at: null,
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'member-1',
              group_id: 'group-1',
              username: 'alice',
              membership_status: 'PENDING_INVITE',
              is_archived: false,
              user_id: 'user-1',
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
              deleted_at: null,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const store = useMembersStore()
    const response = await store.create('group-1', 'alice')

    expect(response.outcome).toBe('invite_sent')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/members')
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('"username":"alice"')
    expect(store.byGroupId['group-1']?.[0]?.username).toBe('alice')
  })
})
