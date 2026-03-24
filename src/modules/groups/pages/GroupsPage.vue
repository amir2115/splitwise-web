<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import BaseModal from '@/shared/components/BaseModal.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import HeroCard from '@/shared/components/HeroCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import { useGroupsStore } from '@/modules/groups/store'
import { useGroupInvitesStore } from '@/modules/groupInvites/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { formatDate } from '@/shared/utils/format'
import { useAuthStore } from '@/shared/stores/auth'

const router = useRouter()
const groupsStore = useGroupsStore()
const invitesStore = useGroupInvitesStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()

const { strings, language } = storeToRefs(settingsStore)
const { groups } = storeToRefs(groupsStore)
const { invites } = storeToRefs(invitesStore)
const { user } = storeToRefs(useAuthStore())

const isCreateModalOpen = ref(false)
const editingGroupId = ref<string | null>(null)
const groupName = ref('')

const editingGroup = computed(() => groups.value.find((item) => item.id === editingGroupId.value) ?? null)

onMounted(async () => {
  try {
    await Promise.all([groupsStore.load(), invitesStore.load()])
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
})

function openCreate() {
  groupName.value = ''
  isCreateModalOpen.value = true
}

function openEdit(groupId: string, name: string) {
  editingGroupId.value = groupId
  groupName.value = name
}

async function saveGroup() {
  try {
    if (editingGroupId.value) {
      await groupsStore.update(editingGroupId.value, groupName.value.trim())
    } else {
      await groupsStore.create(groupName.value.trim())
    }
    closeModal()
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}

async function removeGroup(groupId: string) {
  if (!window.confirm(strings.value.confirmDelete)) return
  try {
    await groupsStore.remove(groupId)
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}

function closeModal() {
  isCreateModalOpen.value = false
  editingGroupId.value = null
  groupName.value = ''
}

async function acceptInvite(inviteId: string) {
  try {
    await invitesStore.accept(inviteId)
    await groupsStore.load()
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}

async function rejectInvite(inviteId: string) {
  try {
    await invitesStore.reject(inviteId)
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}

</script>

<template>
  <div class="page-shell page-stack">
    <PageTopBar :title="strings.appTitle">
      <template #actions>
        <button class="icon-button" type="button" @click="openCreate">＋</button>
      </template>
    </PageTopBar>

    <HeroCard :title="strings.homeHeroTitle" :subtitle="strings.homeHeroSubtitle" icon="◫" />

    <div class="surface-card account-section-card">
      <div class="detail-line">
        <div>
          <div class="page-topbar__title" style="font-size: 16px;">{{ user?.name }} <span v-if="user?.username" class="muted">@{{ user.username }}</span></div>
          <div class="muted">{{ strings.homeTab }}</div>
        </div>
        <button class="outline-button" type="button" @click="openCreate">{{ strings.addGroup }}</button>
      </div>
    </div>

    <SectionHeader :title="strings.invitesTitle" />
    <div class="list-stack">
      <article v-for="invite in invites" :key="invite.id" class="surface-card">
        <div class="detail-line detail-line--start">
          <div style="flex: 1;">
            <div class="page-topbar__title">{{ invite.group_name }}</div>
            <div class="muted">@{{ invite.inviter_username }}</div>
          </div>
          <div class="card-actions group-card-actions">
            <button class="outline-button" type="button" @click="acceptInvite(invite.id)">{{ strings.acceptInvite }}</button>
            <button class="outline-button is-danger" type="button" @click="rejectInvite(invite.id)">{{ strings.rejectInvite }}</button>
          </div>
        </div>
      </article>
      <EmptyStateCard
        v-if="invites.length === 0"
        :title="strings.noInvitesTitle"
        :subtitle="strings.noInvitesSubtitle"
      />
    </div>

    <div class="list-stack">
      <article
        v-for="group in groups"
        :key="group.id"
        class="surface-card surface-card--interactive"
        tabindex="0"
        role="button"
        @click="router.push(`/groups/${group.id}`)"
        @keydown.enter.prevent="router.push(`/groups/${group.id}`)"
        @keydown.space.prevent="router.push(`/groups/${group.id}`)"
      >
        <div class="detail-line detail-line--keep-row">
          <div style="flex: 1; min-width: 0;">
            <div class="page-topbar__title">{{ group.name }}</div>
            <div class="muted">{{ formatDate(group.created_at, language) }}</div>
          </div>
          <div class="card-actions group-card-actions card-actions--inline">
            <button class="icon-button" type="button" @click.stop="openEdit(group.id, group.name)">✎</button>
            <button class="icon-button" type="button" @click.stop="removeGroup(group.id)">🗑</button>
          </div>
        </div>
      </article>

      <EmptyStateCard
        v-if="groups.length === 0"
        :title="strings.noGroupsTitle"
        :subtitle="strings.noGroupsSubtitle"
      />
    </div>
  </div>

  <BaseModal
    v-if="isCreateModalOpen || editingGroup"
    :title="editingGroup ? strings.editGroupTitle : strings.newGroupTitle"
    @close="closeModal"
  >
    <div class="form-field">
      <label class="form-field__label">{{ strings.groupPlaceholder }}</label>
      <input v-model="groupName" class="text-input" type="text" />
    </div>
    <div class="modal-actions">
      <button class="outline-button" type="button" style="flex: 1;" @click="closeModal">{{ strings.cancel }}</button>
      <button class="filled-button" type="button" style="flex: 1; height: 48px;" @click="saveGroup">
        {{ editingGroup ? strings.save : strings.createGroup }}
      </button>
    </div>
  </BaseModal>
</template>
