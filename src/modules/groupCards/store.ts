import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { GroupCard } from '@/shared/api/types'
import { digitsOnly } from '@/shared/utils/format'
import { useAuthStore } from '@/shared/stores/auth'

function normalizeCardNumber(cardNumber: string) {
  return digitsOnly(cardNumber).slice(0, 16)
}

export const useGroupCardsStore = defineStore('groupCards', () => {
  const byGroupId = ref<Record<string, GroupCard[]>>({})
  const isLoading = ref(false)

  function reset() {
    byGroupId.value = {}
    isLoading.value = false
  }

  async function load(groupId: string) {
    const authStore = useAuthStore()
    isLoading.value = true
    try {
      byGroupId.value[groupId] = await authStore.api.get<GroupCard[]>(`/group-cards?group_id=${groupId}`)
    } finally {
      isLoading.value = false
    }
  }

  async function save(payload: { existingId?: string; group_id: string; member_id: string; card_number: string }) {
    const authStore = useAuthStore()
    const { existingId, ...body } = payload
    const requestBody = {
      group_id: body.group_id,
      member_id: body.member_id,
      card_number: normalizeCardNumber(body.card_number),
    }
    const groupCard = existingId
      ? await authStore.api.patch<GroupCard>(`/group-cards/${existingId}`, {
          member_id: requestBody.member_id,
          card_number: requestBody.card_number,
        })
      : await authStore.api.post<GroupCard>('/group-cards', requestBody)

    const current = byGroupId.value[body.group_id] ?? []
    const exists = current.some((item) => item.id === groupCard.id)
    byGroupId.value[body.group_id] = exists
      ? current.map((item) => (item.id === groupCard.id ? groupCard : item))
      : [groupCard, ...current]
    return groupCard
  }

  async function remove(groupCard: GroupCard) {
    const authStore = useAuthStore()
    await authStore.api.delete(`/group-cards/${groupCard.id}`)
    byGroupId.value[groupCard.group_id] = (byGroupId.value[groupCard.group_id] ?? []).filter((item) => item.id !== groupCard.id)
  }

  return { byGroupId, isLoading, load, save, remove, reset }
})
