import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Settlement } from '@/shared/api/types'
import { useAuthStore } from '@/shared/stores/auth'

export const useSettlementsStore = defineStore('settlements', () => {
  const byGroupId = ref<Record<string, Settlement[]>>({})
  const isLoading = ref(false)

  async function load(groupId: string) {
    const authStore = useAuthStore()
    isLoading.value = true
    try {
      byGroupId.value[groupId] = await authStore.api.get<Settlement[]>(`/settlements?group_id=${groupId}`)
    } finally {
      isLoading.value = false
    }
  }

  async function save(payload: {
    existingId?: string
    group_id: string
    from_member_id: string
    to_member_id: string
    amount: number
    note: string | null
  }) {
    const authStore = useAuthStore()
    const { existingId, ...body } = payload
    const settlement = existingId
      ? await authStore.api.patch<Settlement>(`/settlements/${existingId}`, body)
      : await authStore.api.post<Settlement>('/settlements', body)

    const current = byGroupId.value[body.group_id] ?? []
    const exists = current.some((item) => item.id === settlement.id)
    byGroupId.value[body.group_id] = exists
      ? current.map((item) => (item.id === settlement.id ? settlement : item))
      : [settlement, ...current]
    return settlement
  }

  async function remove(settlement: Settlement) {
    const authStore = useAuthStore()
    await authStore.api.delete(`/settlements/${settlement.id}`)
    byGroupId.value[settlement.group_id] = (byGroupId.value[settlement.group_id] ?? []).filter((item) => item.id !== settlement.id)
  }

  return { byGroupId, isLoading, load, save, remove }
})
