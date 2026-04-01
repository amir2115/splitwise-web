<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import BaseModal from '@/shared/components/BaseModal.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import HeroCard from '@/shared/components/HeroCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import { useGroupsStore } from '@/modules/groups/store'
import { useGroupInvitesStore } from '@/modules/groupInvites/store'
import { useMembersStore } from '@/modules/members/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { formatDate } from '@/shared/utils/format'
import { useAuthStore } from '@/shared/stores/auth'
import type { Group } from '@/shared/api/types'

const router = useRouter()
const groupsStore = useGroupsStore()
const invitesStore = useGroupInvitesStore()
const membersStore = useMembersStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()
const authStore = useAuthStore()

const { strings, language } = storeToRefs(settingsStore)
const { groups, isLoading: groupsLoading } = storeToRefs(groupsStore)
const { invites, isLoading: invitesLoading } = storeToRefs(invitesStore)
const { user, isGuestMode } = storeToRefs(authStore)

const isCreateModalOpen = ref(false)
const editingGroupId = ref<string | null>(null)
const groupName = ref('')
const searchQuery = ref('')
const actionGroupId = ref<string | null>(null)
const pendingGroupActionId = ref<string | null>(null)
const pageRef = ref<HTMLElement | null>(null)
const isRefreshing = ref(false)

let pullStartY = 0
let pullDistance = 0

const editingGroup = computed(() => groups.value.find((item) => item.id === editingGroupId.value) ?? null)
const actionGroup = computed(() => groups.value.find((item) => item.id === actionGroupId.value) ?? null)
const pendingGroupAction = computed(() => groups.value.find((item) => item.id === pendingGroupActionId.value) ?? null)
const canDeletePendingGroupForEveryone = computed(() => {
  if (!pendingGroupAction.value) return false
  return pendingGroupAction.value.user_id == null || pendingGroupAction.value.user_id === user.value?.id
})
const showSearch = computed(() => groups.value.length > 4)
const filteredGroups = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return groups.value
  return groups.value.filter((item) => item.name.toLowerCase().includes(query))
})

onMounted(async () => {
  if (isGuestMode.value) return
  try {
    await Promise.all([groupsStore.load(), invitesStore.load()])
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }

  pageRef.value?.addEventListener('touchstart', handleTouchStart, { passive: true })
  pageRef.value?.addEventListener('touchmove', handleTouchMove, { passive: true })
  pageRef.value?.addEventListener('touchend', handleTouchEnd, { passive: true })
})

onBeforeUnmount(() => {
  pageRef.value?.removeEventListener('touchstart', handleTouchStart)
  pageRef.value?.removeEventListener('touchmove', handleTouchMove)
  pageRef.value?.removeEventListener('touchend', handleTouchEnd)
})

function openCreate() {
  if (isGuestMode.value) {
    router.push('/auth/login')
    return
  }
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
  actionGroupId.value = null
  pendingGroupActionId.value = groupId
}

async function deleteGroupForEveryone(groupId: string) {
  try {
    await groupsStore.remove(groupId)
    pendingGroupActionId.value = null
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}

async function leaveGroup(groupId: string) {
  try {
    const currentGroup = groups.value.find((item) => item.id === groupId)
    if (currentGroup?.user_id == null || currentGroup?.user_id === user.value?.id) {
      await groupsStore.remove(groupId)
      pendingGroupActionId.value = null
      return
    }

    if (!user.value?.id) return
    if (!(membersStore.byGroupId[groupId]?.length)) {
      await membersStore.load(groupId)
    }

    const currentMember = (membersStore.byGroupId[groupId] ?? []).find((member) => member.user_id === user.value?.id)
    if (!currentMember) throw new Error(strings.value.genericError)

    await membersStore.remove(currentMember)
    await groupsStore.load(true)
    pendingGroupActionId.value = null
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}

function closeModal() {
  isCreateModalOpen.value = false
  editingGroupId.value = null
  groupName.value = ''
}

function openActions(group: Group) {
  actionGroupId.value = group.id
}

async function acceptInvite(inviteId: string) {
  try {
    await invitesStore.accept(inviteId)
    await groupsStore.load(true)
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

function scrollerTop() {
  return document.querySelector<HTMLElement>('.app-shell__content')?.scrollTop ?? 0
}

function handleTouchStart(event: TouchEvent) {
  if (scrollerTop() > 0 || isRefreshing.value) return
  pullStartY = event.touches[0]?.clientY ?? 0
  pullDistance = 0
}

function handleTouchMove(event: TouchEvent) {
  if (scrollerTop() > 0 || isRefreshing.value || pullStartY <= 0) return
  const currentY = event.touches[0]?.clientY ?? 0
  pullDistance = Math.max(0, currentY - pullStartY)
}

async function handleTouchEnd() {
  if (pullDistance < 84 || isRefreshing.value) {
    pullStartY = 0
    pullDistance = 0
    return
  }

  try {
    isRefreshing.value = true
    await Promise.all([groupsStore.load(true), invitesStore.load('pending', true)])
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  } finally {
    pullStartY = 0
    pullDistance = 0
    isRefreshing.value = false
  }
}

</script>

<template>
  <div ref="pageRef" class="page-shell page-stack">
    <PageTopBar :title="strings.appTitle">
      <template #actions>
        <button class="icon-button" type="button" @click="openCreate">＋</button>
      </template>
    </PageTopBar>

    <HeroCard :title="strings.homeHeroTitle" :subtitle="strings.homeHeroSubtitle" icon="◫" />

    <div class="surface-card account-section-card groups-account-card">
      <div class="groups-account-card__row">
        <div class="groups-account-card__meta">
          <div class="groups-account-card__title">
            <template v-if="user">
              {{ user.name }} <span v-if="user.username" class="muted">@{{ user.username }}</span>
            </template>
            <template v-else>
              {{ strings.accountGuestSubtitle }}
            </template>
          </div>
          <div class="muted groups-account-card__subtitle">{{ strings.homeTab }}</div>
        </div>
        <button class="outline-button groups-account-card__action" type="button" @click="openCreate">
          {{ isGuestMode ? strings.signInLabel : strings.addGroup }}
        </button>
      </div>
    </div>

    <SectionHeader :title="strings.invitesTitle" />
    <div class="list-stack">
      <article v-if="invitesLoading" v-for="item in 2" :key="item" class="surface-card">
        <div class="page-stack" style="gap: 10px;">
          <div class="skeleton-line" style="width: 42%;"></div>
          <div class="skeleton-line" style="width: 28%;"></div>
          <div class="detail-line">
            <div class="skeleton-pill"></div>
            <div class="skeleton-pill"></div>
          </div>
        </div>
      </article>
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
        v-if="!invitesLoading && invites.length === 0"
        :title="strings.noInvitesTitle"
        :subtitle="strings.noInvitesSubtitle"
      />
    </div>

    <div v-if="showSearch" class="groups-search-card" :class="{ 'is-floating': searchQuery }">
      <div class="groups-search-card__icon">⌕</div>
      <div class="groups-search-card__body">
        <label class="groups-search-card__label">{{ strings.searchGroupsLabel }}</label>
        <input v-model="searchQuery" class="groups-search-card__input" type="text" />
      </div>
      <button v-if="searchQuery" class="icon-button groups-search-card__clear" type="button" @click="searchQuery = ''">✕</button>
    </div>

    <div class="list-stack">
      <article v-if="groupsLoading" v-for="item in 3" :key="`group-skeleton-${item}`" class="surface-card">
        <div class="page-stack" style="gap: 10px;">
          <div class="skeleton-line" style="width: 54%;"></div>
          <div class="skeleton-line" style="width: 24%;"></div>
        </div>
      </article>
      <article
        v-for="group in filteredGroups"
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
            <button class="icon-button" type="button" @click.stop="openActions(group)">⋯</button>
          </div>
        </div>
      </article>

      <EmptyStateCard
        v-if="!groupsLoading && filteredGroups.length === 0"
        :title="showSearch && searchQuery ? strings.noSearchResultsTitle : strings.noGroupsTitle"
        :subtitle="showSearch && searchQuery ? strings.noSearchResultsSubtitle : strings.noGroupsSubtitle"
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

  <BaseModal v-if="actionGroup" :title="strings.groupActionsTitle" @close="actionGroupId = null">
    <div class="page-stack" style="gap: 10px;">
      <p class="muted">{{ strings.groupActionsSubtitle }}</p>
      <button class="outline-button" type="button" @click="openEdit(actionGroup.id, actionGroup.name); actionGroupId = null">
        {{ strings.edit }}
      </button>
      <button class="outline-button is-danger" type="button" @click="removeGroup(actionGroup.id)">
        {{ actionGroup.user_id === user?.id ? strings.delete : strings.leaveGroup }}
      </button>
    </div>
  </BaseModal>

  <BaseModal v-if="pendingGroupAction" :title="pendingGroupAction.name" @close="pendingGroupActionId = null">
    <div class="page-stack" style="gap: 12px;">
      <p class="muted group-delete-dialog__subtitle">{{ strings.groupActionsSubtitle }}</p>
      <button class="group-delete-dialog__option group-delete-dialog__option--leave" type="button" @click="leaveGroup(pendingGroupAction.id)">
        <strong>{{ strings.leaveGroup }}</strong>
        <span>{{ strings.groupLeaveMessage }}</span>
      </button>
      <button
        v-if="canDeletePendingGroupForEveryone"
        class="group-delete-dialog__option group-delete-dialog__option--delete"
        type="button"
        @click="deleteGroupForEveryone(pendingGroupAction.id)"
      >
        <strong>{{ strings.deleteGroupForEveryone }}</strong>
        <span>{{ strings.groupDeleteConfirmMessage }}</span>
      </button>
      <button class="outline-button" type="button" @click="pendingGroupActionId = null">
        {{ strings.cancel }}
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.skeleton-line,
.skeleton-pill {
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-outline) 20%, transparent),
    color-mix(in srgb, var(--color-primary) 12%, transparent),
    color-mix(in srgb, var(--color-outline) 20%, transparent)
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s linear infinite;
}

.skeleton-line {
  height: 14px;
}

.skeleton-pill {
  width: 110px;
  height: 40px;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}

.groups-account-card {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 42%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 94%, white), var(--color-surface));
}

.groups-account-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.groups-account-card__meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: start;
}

.groups-account-card__title {
  font-size: 16px;
  line-height: 1.5;
  font-weight: 700;
  color: var(--color-on-surface);
}

.groups-account-card__subtitle {
  font-size: 14px;
}

.groups-account-card__action {
  min-width: 138px;
  flex: 0 0 auto;
  align-self: center;
}

.groups-search-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 30px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 10%, transparent), color-mix(in srgb, var(--color-surface) 96%, white));
  border: 1px solid color-mix(in srgb, var(--color-outline) 12%, transparent);
}

.groups-search-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  color: var(--color-primary);
  font-size: 22px;
  flex: 0 0 auto;
}

.groups-search-card__body {
  min-width: 0;
  flex: 1;
  position: relative;
  min-height: 52px;
}

.groups-search-card__label {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: 50%;
  font-size: 14px;
  line-height: 1.3;
  font-weight: 600;
  color: color-mix(in srgb, var(--color-on-surface-variant) 88%, var(--color-primary));
  transition: transform 0.18s ease, font-size 0.18s ease, color 0.18s ease;
  transform-origin: right center;
  transform: translateY(-50%);
  pointer-events: none;
}

.groups-search-card__input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-on-surface);
  font: inherit;
  font-size: 18px;
  line-height: 1.5;
  min-height: 52px;
  padding: 22px 0 0;
}

.groups-search-card__input::placeholder {
  color: transparent;
}

.groups-search-card__clear {
  flex: 0 0 auto;
}

.groups-search-card.is-floating .groups-search-card__label,
.groups-search-card:focus-within .groups-search-card__label {
  color: var(--color-primary);
  font-size: 12px;
  transform: translateY(-18px);
}

.groups-search-card:focus-within {
  border-color: color-mix(in srgb, var(--color-primary) 36%, var(--color-outline));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.group-delete-dialog__subtitle {
  text-align: center;
}

.group-delete-dialog__option {
  width: 100%;
  border-radius: 24px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: start;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
}

.group-delete-dialog__option strong {
  font-size: 17px;
  line-height: 26px;
}

.group-delete-dialog__option span {
  font-size: 14px;
  line-height: 22px;
}

.group-delete-dialog__option--leave {
  background: color-mix(in srgb, var(--color-tertiary) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-tertiary) 44%, transparent);
  color: var(--color-tertiary);
}

.group-delete-dialog__option--delete {
  background: color-mix(in srgb, var(--color-error) 6%, transparent);
  border-color: color-mix(in srgb, var(--color-error) 48%, transparent);
  color: var(--color-error);
}

@media (max-width: 560px) {
  .groups-account-card__row {
    align-items: center;
  }

  .groups-search-card {
    padding: 12px;
  }

  .groups-search-card__icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .groups-search-card__input {
    font-size: 16px;
  }
}
</style>
