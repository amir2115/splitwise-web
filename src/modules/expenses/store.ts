import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Expense } from '@/shared/api/types'
import { useAuthStore } from '@/shared/stores/auth'

export const useExpensesStore = defineStore('expenses', () => {
  const byGroupId = ref<Record<string, Expense[]>>({})
  const isLoading = ref(false)

  async function load(groupId: string) {
    const authStore = useAuthStore()
    isLoading.value = true
    try {
      byGroupId.value[groupId] = await authStore.api.get<Expense[]>(`/expenses?group_id=${groupId}`)
    } finally {
      isLoading.value = false
    }
  }

  async function save(payload: {
    existingId?: string
    group_id: string
    title: string
    note: string | null
    total_amount: number
    split_type: 'EQUAL' | 'EXACT'
    payers: Array<{ member_id: string; amount: number }>
    shares: Array<{ member_id: string; amount: number }>
  }) {
    const authStore = useAuthStore()
    const { existingId, ...body } = payload
    const expense = existingId
      ? await authStore.api.patch<Expense>(`/expenses/${existingId}`, body)
      : await authStore.api.post<Expense>('/expenses', body)

    const current = byGroupId.value[body.group_id] ?? []
    const exists = current.some((item) => item.id === expense.id)
    byGroupId.value[body.group_id] = exists
      ? current.map((item) => (item.id === expense.id ? expense : item))
      : [expense, ...current]
    return expense
  }

  async function remove(expense: Expense) {
    const authStore = useAuthStore()
    await authStore.api.delete(`/expenses/${expense.id}`)
    byGroupId.value[expense.group_id] = (byGroupId.value[expense.group_id] ?? []).filter((item) => item.id !== expense.id)
  }

  return { byGroupId, isLoading, load, save, remove }
})
