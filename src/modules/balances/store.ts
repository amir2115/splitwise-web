import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { GroupBalanceResponse } from '@/shared/api/types'
import { useAuthStore } from '@/shared/stores/auth'

export const useBalancesStore = defineStore('balances', () => {
  const byGroupId = ref<Record<string, GroupBalanceResponse>>({})
  const isLoading = ref(false)

  function reset() {
    byGroupId.value = {}
    isLoading.value = false
  }

  async function load(groupId: string) {
    const authStore = useAuthStore()
    isLoading.value = true
    try {
      byGroupId.value[groupId] = await authStore.api.get<GroupBalanceResponse>(`/groups/${groupId}/balances`)
    } finally {
      isLoading.value = false
    }
  }

  return { byGroupId, isLoading, load, reset }
})
