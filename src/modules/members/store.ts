import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AddMemberResponse, InlineMemberCreateRequest, Member, MemberSuggestion } from '@/shared/api/types'
import { useAuthStore } from '@/shared/stores/auth'

export const useMembersStore = defineStore('members', () => {
  const byGroupId = ref<Record<string, Member[]>>({})
  const isLoading = ref(false)

  function reset() {
    byGroupId.value = {}
    isLoading.value = false
  }

  async function load(groupId: string) {
    const authStore = useAuthStore()
    isLoading.value = true
    try {
      byGroupId.value[groupId] = await authStore.api.get<Member[]>(`/members?group_id=${groupId}`)
    } finally {
      isLoading.value = false
    }
  }

  async function create(groupId: string, username: string) {
    const authStore = useAuthStore()
    const response = await authStore.api.post<AddMemberResponse>('/members', { group_id: groupId, username, is_archived: false })
    await load(groupId)
    return response
  }

  async function searchSuggestions(groupId: string, query: string, limit = 8) {
    const authStore = useAuthStore()
    const searchParams = new URLSearchParams({
      group_id: groupId,
      query,
      limit: String(limit),
    })
    return authStore.api.get<MemberSuggestion[]>(`/members/suggestions?${searchParams.toString()}`)
  }

  async function inlineCreate(payload: InlineMemberCreateRequest) {
    const authStore = useAuthStore()
    const response = await authStore.api.post<AddMemberResponse>('/members/inline-create', payload)
    await load(payload.group_id)
    return response
  }

  async function update(member: Member, patch: Partial<Pick<Member, 'username' | 'is_archived'>>) {
    const authStore = useAuthStore()
    const updated = await authStore.api.patch<Member>(`/members/${member.id}`, patch)
    byGroupId.value[member.group_id] = (byGroupId.value[member.group_id] ?? []).map((item) => (item.id === member.id ? updated : item))
    return updated
  }

  async function remove(member: Member) {
    const authStore = useAuthStore()
    await authStore.api.delete(`/members/${member.id}`)
    byGroupId.value[member.group_id] = (byGroupId.value[member.group_id] ?? []).filter((item) => item.id !== member.id)
  }

  return { byGroupId, isLoading, load, create, inlineCreate, searchSuggestions, update, remove, reset }
})
