import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { GroupInvite } from '@/shared/api/types'
import { useAuthStore } from '@/shared/stores/auth'

export const useGroupInvitesStore = defineStore('groupInvites', () => {
  const invites = ref<GroupInvite[]>([])
  const isLoading = ref(false)
  const hasLoaded = ref(false)

  function reset() {
    invites.value = []
    isLoading.value = false
    hasLoaded.value = false
  }

  async function load(status = 'pending', force = false) {
    const authStore = useAuthStore()
    if ((isLoading.value || hasLoaded.value) && !force) return
    isLoading.value = true
    try {
      invites.value = await authStore.api.get<GroupInvite[]>(`/group-invites?status=${status}`)
      hasLoaded.value = true
    } finally {
      isLoading.value = false
    }
  }

  async function accept(inviteId: string) {
    const authStore = useAuthStore()
    const invite = await authStore.api.post<GroupInvite>(`/group-invites/${inviteId}/accept`)
    invites.value = invites.value.filter((item) => item.id !== inviteId)
    return invite
  }

  async function reject(inviteId: string) {
    const authStore = useAuthStore()
    const invite = await authStore.api.post<GroupInvite>(`/group-invites/${inviteId}/reject`)
    invites.value = invites.value.filter((item) => item.id !== inviteId)
    return invite
  }

  return { invites, isLoading, hasLoaded, load, accept, reject, reset }
})
