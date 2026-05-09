<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import BaseModal from '@/shared/components/BaseModal.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import Avatar from '@/shared/components/Avatar.vue'
import SwipeableGroupRow from '@/modules/groups/components/SwipeableGroupRow.vue'
import { useGroupsStore } from '@/modules/groups/store'
import { useGroupInvitesStore } from '@/modules/groupInvites/store'
import { useMembersStore } from '@/modules/members/store'
import { useBalancesStore } from '@/modules/balances/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { useAuthStore } from '@/shared/stores/auth'
import type { Group } from '@/shared/api/types'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'
import Icon from '@/shared/components/Icon.vue'

const router = useRouter()
const groupsStore = useGroupsStore()
const invitesStore = useGroupInvitesStore()
const membersStore = useMembersStore()
const balancesStore = useBalancesStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()
const authStore = useAuthStore()

const { strings, language } = storeToRefs(settingsStore)
const { groups, isLoading: groupsLoading } = storeToRefs(groupsStore)
const { invites, isLoading: invitesLoading } = storeToRefs(invitesStore)
const { byGroupId: membersByGroupId } = storeToRefs(membersStore)
const { byGroupId: balancesByGroupId } = storeToRefs(balancesStore)
const { user, isGuestMode } = storeToRefs(authStore)

const isCreateModalOpen = ref(false)
const editingGroupId = ref<string | null>(null)
const groupName = ref('')
const searchQuery = ref('')
const pendingGroupActionId = ref<string | null>(null)
const longPressGroupId = ref<string | null>(null)
const openSwipeId = ref<string | null>(null)
const pageRef = ref<HTMLElement | null>(null)
const isRefreshing = ref(false)

let pullStartY = 0
let pullDistance = 0

const editingGroup = computed(() => groups.value.find((item) => item.id === editingGroupId.value) ?? null)
const longPressGroup = computed(() => groups.value.find((item) => item.id === longPressGroupId.value) ?? null)
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

interface GroupView {
  group: Group
  memberCount: number
  subtitle: string
  direction: 'receive' | 'owe' | 'settled' | 'unknown'
  amount: number | null
  isLoadingBalance: boolean
}

const groupViews = computed<GroupView[]>(() => filteredGroups.value.map((group) => buildGroupView(group)))

function buildGroupView(group: Group): GroupView {
  const members = membersByGroupId.value[group.id] ?? []
  const memberCount = members.length

  const balance = balancesByGroupId.value[group.id]
  const haveBalance = !!balance
  const myMember = haveBalance && user.value
    ? balance.balances.find((b) => members.find((m) => m.id === b.member_id)?.user_id === user.value?.id)
    : undefined

  let direction: GroupView['direction'] = 'unknown'
  let amount: number | null = null
  if (haveBalance) {
    if (myMember) {
      const net = myMember.net_balance ?? 0
      amount = Math.abs(net)
      if (net > 0) direction = 'receive'
      else if (net < 0) direction = 'owe'
      else direction = 'settled'
    } else {
      // user has no member in group → settled visually
      direction = 'settled'
      amount = 0
    }
  }

  const memberLabel = strings.value.membersCount.replace('{count}', String(memberCount))
  const lastActivity = describeRelativeDate(group.updated_at, language.value)
  const subtitle = memberCount > 0 && lastActivity ? `${memberLabel} · ${lastActivity}` : memberCount > 0 ? memberLabel : (lastActivity ?? '')

  return {
    group,
    memberCount,
    subtitle,
    direction,
    amount,
    isLoadingBalance: !haveBalance && !isGuestMode.value,
  }
}

function describeRelativeDate(iso: string | null | undefined, lang: 'fa' | 'en'): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = Date.now() - date.getTime()
  const oneDay = 86_400_000
  const days = Math.max(0, Math.floor(diffMs / oneDay))
  if (days === 0) return lang === 'fa' ? 'امروز' : 'today'
  if (days === 1) return lang === 'fa' ? 'دیروز' : 'yesterday'
  if (days < 30) return lang === 'fa' ? `${days} روز پیش` : `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return lang === 'fa' ? `${months} ماه پیش` : `${months}mo ago`
  const years = Math.floor(days / 365)
  return lang === 'fa' ? `${years} سال پیش` : `${years}y ago`
}

async function ensureMembersAndBalance(groupId: string) {
  if (isGuestMode.value) return
  // load members (cheap) then balance (small) — both feed the row sub & amount
  try {
    const tasks: Array<Promise<unknown>> = []
    if (!membersByGroupId.value[groupId]?.length) tasks.push(membersStore.load(groupId))
    if (!balancesByGroupId.value[groupId]) tasks.push(balancesStore.load(groupId))
    if (tasks.length) await Promise.allSettled(tasks)
  } catch {
    // swallow — row will simply show without amount
  }
}

watch(
  () => groups.value.map((g) => g.id),
  (ids) => {
    // load member count + balance for visible groups in background
    ids.forEach((id) => { void ensureMembersAndBalance(id) })
  },
  { immediate: true },
)

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
  longPressGroupId.value = null
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

function requestRemove(groupId: string) {
  longPressGroupId.value = null
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

function openLongPressActions(group: Group) {
  longPressGroupId.value = group.id
}

function navigateToGroup(groupId: string) {
  router.push(`/groups/${groupId}`)
}

function onSwipeStateChange(rowId: string | null) {
  openSwipeId.value = rowId
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
  <div ref="pageRef" class="page-shell page-stack groups-page">
    <PageTopBar :title="strings.groupsHeading">
      <template #actions>
        <button class="topbar-add" type="button" :aria-label="strings.addGroup" @click="openCreate">
          <Icon name="plus" :size="18" />
        </button>
      </template>
    </PageTopBar>

    <!-- Account hero -->
    <div class="account-hero">
      <Avatar :name="user?.name || strings.accountGuestSubtitle" tone="brand" :size="44" />
      <div class="account-hero__meta">
        <strong v-if="user" class="account-hero__title">{{ user.name }}</strong>
        <strong v-else class="account-hero__title">{{ strings.accountGuestSubtitle }}</strong>
        <span class="account-hero__sub">
          <template v-if="user && user.username"><UsernameHandle :username="user.username" /></template>
          <template v-else>{{ strings.homeHeroSubtitle }}</template>
        </span>
      </div>
      <button class="account-hero__cta outline-button" type="button" @click="openCreate">
        {{ isGuestMode ? strings.signInLabel : strings.addGroup }}
      </button>
    </div>

    <!-- Search -->
    <label v-if="showSearch" class="groups-search">
      <span class="groups-search__icon" aria-hidden="true">
        <Icon name="search" :size="16" />
      </span>
      <input v-model="searchQuery" type="text" :placeholder="strings.searchGroupsLabel" :aria-label="strings.searchGroupsLabel" />
      <button v-if="searchQuery" class="groups-search__clear" type="button" :aria-label="strings.cancel" @click="searchQuery = ''">
        <Icon name="close" :size="14" />
      </button>
    </label>

    <!-- Pending invites -->
    <template v-if="invitesLoading || invites.length > 0">
      <h3 class="eyebrow">{{ strings.invitesTitle }}</h3>
      <div class="list-stack">
        <article v-if="invitesLoading" v-for="item in 1" :key="`invite-skel-${item}`" class="surface-card invite-card">
          <div class="skeleton-pill" style="width: 36px; height: 36px; border-radius: 50%;"></div>
          <div class="invite-card__meta">
            <div class="skeleton-line" style="width: 50%;"></div>
            <div class="skeleton-line" style="width: 30%;"></div>
          </div>
          <div class="skeleton-pill" style="width: 90px;"></div>
        </article>
        <article v-for="invite in invites" :key="invite.id" class="surface-card invite-card">
          <Avatar :name="invite.group_name" tone="accent" :size="40" />
          <div class="invite-card__meta">
            <strong>{{ invite.group_name }}</strong>
            <span class="muted"><UsernameHandle :username="invite.inviter_username" /></span>
          </div>
          <div class="invite-card__actions">
            <button class="invite-card__btn invite-card__btn--ghost" type="button" @click="rejectInvite(invite.id)">{{ strings.rejectInvite }}</button>
            <button class="invite-card__btn invite-card__btn--primary" type="button" @click="acceptInvite(invite.id)">{{ strings.acceptInvite }}</button>
          </div>
        </article>
      </div>
    </template>

    <!-- Groups -->
    <div class="groups-section">
      <h3 class="eyebrow">{{ strings.groupsHeading }}</h3>

      <div class="groups-list">
        <div v-if="groupsLoading && groups.length === 0" v-for="item in 3" :key="`group-skeleton-${item}`" class="groups-skel-row">
          <div class="skeleton-pill" style="width: 40px; height: 40px; border-radius: 50%;"></div>
          <div class="groups-skel-row__body">
            <div class="skeleton-line" style="width: 50%;"></div>
            <div class="skeleton-line" style="width: 28%;"></div>
          </div>
          <div class="skeleton-pill" style="width: 56px; height: 12px;"></div>
        </div>

        <SwipeableGroupRow
          v-for="view in groupViews"
          :key="view.group.id"
          :row-id="view.group.id"
          :open-id="openSwipeId"
          :name="view.group.name"
          :subtitle="view.subtitle || strings.appTitle"
          :direction="view.direction"
          :amount="view.amount"
          :is-loading-balance="view.isLoadingBalance"
          :receive-label="strings.groupBalanceOwesYou"
          :owe-label="strings.groupBalanceYouOwe"
          :settled-label="strings.groupBalanceSettled"
          :edit-label="strings.edit"
          :delete-label="strings.delete"
          @open="navigateToGroup(view.group.id)"
          @edit="openEdit(view.group.id, view.group.name)"
          @remove="requestRemove(view.group.id)"
          @long-press="openLongPressActions(view.group)"
          @swipe-state-change="onSwipeStateChange"
        />

        <div v-if="!groupsLoading && filteredGroups.length === 0" class="groups-empty">
          <EmptyStateCard
            :title="showSearch && searchQuery ? strings.noSearchResultsTitle : strings.noGroupsTitle"
            :subtitle="showSearch && searchQuery ? strings.noSearchResultsSubtitle : strings.noGroupsSubtitle"
            icon="◫"
          />
        </div>
      </div>
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

  <BaseModal v-if="longPressGroup" :title="longPressGroup.name" @close="longPressGroupId = null">
    <div class="page-stack longpress-sheet">
      <p class="muted">{{ strings.groupActionsSubtitle }}</p>
      <button class="longpress-sheet__action longpress-sheet__action--edit" type="button" @click="openEdit(longPressGroup.id, longPressGroup.name)">
        <Icon name="edit" :size="18" />
        <span>{{ strings.edit }}</span>
      </button>
      <button class="longpress-sheet__action longpress-sheet__action--delete" type="button" @click="requestRemove(longPressGroup.id)">
        <Icon name="trash" :size="18" />
        <span>{{ longPressGroup.user_id === user?.id ? strings.delete : strings.leaveGroup }}</span>
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
.groups-page { padding-top: 2px; }

/* Top-bar add button */
.topbar-add {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand);
  color: var(--brand-on);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
  box-shadow: var(--shadow-1);
  transition: transform var(--d-instant) var(--ease-standard), background var(--d-fast) var(--ease-standard);
}
.topbar-add:hover { background: var(--brand-strong); }
.topbar-add:active { transform: scale(0.94); }

/* Account hero */
.account-hero {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-1);
  animation: hero-rise var(--d-emphasized) var(--ease-emphasized) both;
}
@keyframes hero-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.account-hero__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.account-hero__title {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.account-hero__sub {
  font-size: var(--t-caption);
  color: var(--fg-subtle);
}
.account-hero__cta {
  flex: 0 0 auto;
  min-height: 36px;
  font-size: var(--t-label);
  padding-inline: var(--s-4);
}

/* Search */
.groups-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--fg-subtle);
  transition: border-color var(--d-fast) var(--ease-standard), box-shadow var(--d-fast) var(--ease-standard);
}
.groups-search:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--ring);
  color: var(--fg);
}
.groups-search input {
  flex: 1;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--fg);
}
.groups-search input::placeholder { color: var(--fg-subtle); }
.groups-search__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.groups-search__clear {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--fg-subtle);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.groups-search__clear:hover { background: var(--hover); color: var(--brand); }

/* Eyebrow */
.eyebrow { margin: var(--s-2) 0 0; }

/* Invite card */
.invite-card {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-5);
}
.invite-card__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.invite-card__meta strong {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
}
.invite-card__actions {
  display: flex;
  gap: 6px;
  align-items: center;
}
.invite-card__btn {
  border: 0;
  border-radius: var(--r-md);
  font-size: 13px;
  font-weight: var(--fw-medium);
  padding: 6px 12px;
  min-height: 32px;
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard), transform var(--d-instant) var(--ease-standard);
}
.invite-card__btn:active { transform: scale(0.97); }
.invite-card__btn--ghost {
  background: transparent;
  color: var(--fg-muted);
}
.invite-card__btn--ghost:hover { background: var(--hover); color: var(--fg); }
.invite-card__btn--primary {
  background: var(--brand);
  color: var(--brand-on);
}
.invite-card__btn--primary:hover { background: var(--brand-strong); }

/* Groups list — flat rows on the page bg, matches Swiply design */
.groups-section {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}
.groups-list {
  display: flex;
  flex-direction: column;
  animation: list-rise var(--d-emphasized) var(--ease-emphasized) both;
}
@keyframes list-rise {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.groups-list :deep(.swipe-row__surface) {
  background: transparent;
}
/* Subtle hover only on capable pointers (mouse) */
@media (hover: hover) {
  .groups-list :deep(.swipe-row:not(.is-dragging):not(.is-open) .swipe-row__surface:hover) {
    background: color-mix(in srgb, var(--brand) 4%, transparent);
  }
}

.groups-skel-row {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-3);
  border-bottom: 1px solid var(--divider);
}
.groups-skel-row:last-child { border-bottom: 0; }
.groups-skel-row__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-line,
.skeleton-pill {
  border-radius: var(--r-pill);
  background: linear-gradient(90deg, var(--surface-sunk), var(--surface-2), var(--surface-sunk));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
.skeleton-line { height: 12px; }
.skeleton-pill { width: 92px; height: 32px; }
@keyframes shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

.groups-empty { padding: var(--s-3) 0; }

/* Long-press action sheet */
.longpress-sheet { gap: 10px; }
.longpress-sheet__action {
  width: 100%;
  border: 0;
  border-radius: var(--r-md);
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-5);
  font-size: var(--t-body);
  font-weight: var(--fw-medium);
  cursor: pointer;
  text-align: start;
  transition: transform var(--d-instant) var(--ease-standard), background var(--d-fast) var(--ease-standard);
}
.longpress-sheet__action:active { transform: scale(0.985); }
.longpress-sheet__action svg { width: 18px; height: 18px; flex-shrink: 0; }
.longpress-sheet__action--edit {
  background: var(--accent-soft);
  color: var(--accent);
}
.longpress-sheet__action--delete {
  background: var(--neg-soft);
  color: var(--neg);
}

/* Group delete dialog options */
.group-delete-dialog__subtitle { text-align: center; }
.group-delete-dialog__option {
  width: 100%;
  border-radius: var(--r-md);
  padding: var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  text-align: start;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
}
.group-delete-dialog__option strong {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
}
.group-delete-dialog__option span {
  font-size: var(--t-label);
  line-height: var(--lh-body);
}
.group-delete-dialog__option--leave {
  background: var(--accent-soft);
  color: var(--accent);
}
.group-delete-dialog__option--delete {
  background: var(--neg-soft);
  color: var(--neg);
}

@media (max-width: 560px) {
  .invite-card__actions { gap: 4px; }
  .invite-card__btn { padding: 6px 10px; font-size: 12px; }
  .account-hero__cta { min-height: 32px; padding-inline: var(--s-3); }
  .groups-list { padding: 4px 8px; }
}
</style>
