import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { GroupInvite } from '@/shared/api/types'
import { useAuthStore } from '@/shared/stores/auth'

export const useGroupInvitesStore = defineStore('groupInvites', () => {
  const invites = ref<GroupInvite[]>([])
  const isLoading = ref(false)

  async function load(status = 'pending') {
    const authStore = useAuthStore()
    isLoading.value = true
    try {
      invites.value = await authStore.api.get<GroupInvite[]>(`/group-invites?status=${status}`)
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

  return { invites, isLoading, load, accept, reject }
})
