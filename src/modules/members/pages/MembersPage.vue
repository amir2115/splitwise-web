<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import BaseModal from '@/shared/components/BaseModal.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import { useGroupsStore } from '@/modules/groups/store'
import { useMembersStore } from '@/modules/members/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { formatDate } from '@/shared/utils/format'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string
const groupsStore = useGroupsStore()
const membersStore = useMembersStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()

const { strings, language } = storeToRefs(settingsStore)
const { groups } = storeToRefs(groupsStore)
const { byGroupId } = storeToRefs(membersStore)

const group = computed(() => groups.value.find((item) => item.id === groupId))
const members = computed(() => byGroupId.value[groupId] ?? [])

const modalMemberId = ref<string | null>(null)
const memberUsername = ref('')

onMounted(async () => {
  try {
    if (groups.value.length === 0) await groupsStore.load()
    await membersStore.load(groupId)
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
})

function openCreate() {
  modalMemberId.value = ''
  memberUsername.value = ''
}

function openEdit(id: string, username: string) {
  modalMemberId.value = id
  memberUsername.value = username
}

function closeModal() {
  modalMemberId.value = null
  memberUsername.value = ''
}

async function saveMember() {
  try {
    if (modalMemberId.value) {
      const member = members.value.find((item) => item.id === modalMemberId.value)
      if (!member) return
      await membersStore.update(member, { username: memberUsername.value.trim() })
    } else {
      const response = await membersStore.create(groupId, memberUsername.value.trim())
      if (response.outcome === 'invite_sent') {
        snackbarStore.push(strings.value.pendingInviteLabel, 'info')
      }
    }
    closeModal()
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}

async function removeMember(id: string) {
  if (!window.confirm(strings.value.confirmDelete)) return
  const member = members.value.find((item) => item.id === id)
  if (!member) return
  try {
    await membersStore.remove(member)
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}
</script>

<template>
  <div class="page-shell page-stack">
    <PageTopBar :title="`${strings.membersOfGroupPrefix} ${group?.name ?? ''}`" can-go-back @back="router.back()">
      <template #actions>
        <button class="icon-button" type="button" @click="openCreate">＋</button>
      </template>
    </PageTopBar>

    <div class="list-stack">
      <article v-for="member in members" :key="member.id" class="surface-card" style="padding: 16px;">
        <div class="detail-line detail-line--keep-row">
          <div style="min-width: 0; flex: 1;">
            <div class="page-topbar__title" style="font-size: 16px;">@{{ member.username }}</div>
            <div class="muted">{{ formatDate(member.created_at, language) }}</div>
            <div v-if="member.membership_status === 'PENDING_INVITE'" class="muted" style="margin-top: 4px;">{{ strings.pendingInviteLabel }}</div>
          </div>
          <div class="card-actions card-actions--inline">
            <button class="icon-button" type="button" @click="openEdit(member.id, member.username)">✎</button>
            <button class="icon-button" type="button" @click="removeMember(member.id)">🗑</button>
          </div>
        </div>
      </article>
      <EmptyStateCard v-if="members.length === 0" :title="strings.noMembersTitle" :subtitle="strings.noMembersSubtitle" />
    </div>
  </div>

  <BaseModal v-if="modalMemberId !== null" :title="modalMemberId ? strings.editMember : strings.addMember" @close="closeModal">
    <div class="form-field">
      <label class="form-field__label">{{ strings.memberPlaceholder }}</label>
      <input v-model="memberUsername" class="text-input" type="text" autocapitalize="off" autocomplete="off" />
    </div>
    <div class="modal-actions">
      <button class="outline-button" type="button" style="flex: 1;" @click="closeModal">{{ strings.cancel }}</button>
      <button class="filled-button" type="button" style="flex: 1; height: 48px;" @click="saveMember">{{ strings.save }}</button>
    </div>
  </BaseModal>
</template>
