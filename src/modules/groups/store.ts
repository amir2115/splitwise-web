import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Group } from '@/shared/api/types'
import { useAuthStore } from '@/shared/stores/auth'

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<Group[]>([])
  const isLoading = ref(false)
  const hasLoaded = ref(false)

  async function load(force = false) {
    const authStore = useAuthStore()
    if ((isLoading.value || hasLoaded.value) && !force) return
    isLoading.value = true
    try {
      groups.value = await authStore.api.get<Group[]>('/groups')
      hasLoaded.value = true
    } finally {
      isLoading.value = false
    }
  }

  async function create(name: string) {
    const authStore = useAuthStore()
    const group = await authStore.api.post<Group>('/groups', { name })
    groups.value = [group, ...groups.value]
    return group
  }

  async function update(groupId: string, name: string) {
    const authStore = useAuthStore()
    const group = await authStore.api.patch<Group>(`/groups/${groupId}`, { name })
    groups.value = groups.value.map((item) => (item.id === groupId ? group : item))
    return group
  }

  async function remove(groupId: string) {
    const authStore = useAuthStore()
    await authStore.api.delete(`/groups/${groupId}`)
    groups.value = groups.value.filter((item) => item.id !== groupId)
  }

  return { groups, isLoading, hasLoaded, load, create, update, remove }
})
