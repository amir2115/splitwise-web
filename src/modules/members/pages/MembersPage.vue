<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ApiError } from '@/shared/api/client'
import BaseModal from '@/shared/components/BaseModal.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import PasswordField from '@/shared/components/PasswordField.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import { useGroupsStore } from '@/modules/groups/store'
import { MIN_MEMBER_SUGGESTION_QUERY_LENGTH, normalizeMemberSuggestionQuery, useMemberSuggestions } from '@/modules/members/memberSuggestions'
import { useMembersStore } from '@/modules/members/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import type { MemberSuggestion } from '@/shared/api/types'
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
const memberSuggestions = useMemberSuggestions((query) => membersStore.searchSuggestions(groupId, query))
const {
  activeIndex,
  applySelection: applyMemberSuggestion,
  dismissSuggestions,
  errorMessage: memberSuggestionError,
  hasResolvedQuery,
  isLoading: isSuggestionLoading,
  moveSelection,
  scheduleSearch,
  selectActiveSuggestion,
  setActiveIndex,
  suggestions,
} = memberSuggestions

const isCreateMode = computed(() => modalMemberId.value === '')
const isInlineCreateMode = ref(false)
const normalizedMemberQuery = computed(() => normalizeMemberSuggestionQuery(memberUsername.value))
const shouldShowSuggestionHint = computed(
  () => isCreateMode.value && normalizedMemberQuery.value.length < MIN_MEMBER_SUGGESTION_QUERY_LENGTH,
)
const shouldShowNoSuggestionResults = computed(
  () =>
    isCreateMode.value &&
    !isInlineCreateMode.value &&
    normalizedMemberQuery.value.length >= MIN_MEMBER_SUGGESTION_QUERY_LENGTH &&
    hasResolvedQuery.value &&
    !isSuggestionLoading.value &&
    !memberSuggestionError.value &&
    suggestions.value.length === 0,
)
const shouldShowInlineCreateAction = computed(
  () => (isCreateMode.value && shouldShowNoSuggestionResults.value) || (isInlineCreateMode.value && isCreateMode.value),
)
const modalPrimaryActionLabel = computed(() => (shouldShowInlineCreateAction.value ? strings.value.memberCreateAction : strings.value.save))
const inlineCreateName = ref('')
const inlineCreatePassword = ref('')
const inlineCreatePhoneNumber = ref('')
const inlineCreateError = ref('')
const isInlineCreateSubmitting = ref(false)
const isModalBusy = computed(() => isInlineCreateSubmitting.value)

onMounted(async () => {
  try {
    if (groups.value.length === 0) await groupsStore.load()
    await membersStore.load(groupId)
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
})

onBeforeUnmount(() => {
  dismissSuggestions()
})

function openCreate() {
  modalMemberId.value = ''
  memberUsername.value = ''
  inlineCreateName.value = ''
  inlineCreatePassword.value = ''
  inlineCreatePhoneNumber.value = ''
  inlineCreateError.value = ''
  isInlineCreateMode.value = false
  dismissSuggestions()
}

function openEdit(id: string, username: string) {
  modalMemberId.value = id
  memberUsername.value = username
  dismissSuggestions()
}

function closeModal() {
  modalMemberId.value = null
  memberUsername.value = ''
  inlineCreateName.value = ''
  inlineCreatePassword.value = ''
  inlineCreatePhoneNumber.value = ''
  inlineCreateError.value = ''
  isInlineCreateMode.value = false
  dismissSuggestions()
}

function updateCreateSuggestions() {
  if (!isCreateMode.value) return
  scheduleSearch(memberUsername.value)
}

function applySuggestion(suggestion: MemberSuggestion) {
  memberUsername.value = applyMemberSuggestion(suggestion)
}

function onMemberInputKeydown(event: KeyboardEvent) {
  if (!isCreateMode.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveSelection(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveSelection(-1)
    return
  }
  if (event.key === 'Escape') {
    dismissSuggestions()
    return
  }
  if (event.key === 'Enter' && suggestions.value.length > 0) {
    const selectedSuggestion = selectActiveSuggestion()
    if (!selectedSuggestion) return
    event.preventDefault()
    applySuggestion(selectedSuggestion)
  }
}

async function saveMember() {
  try {
    dismissSuggestions()
    if (modalMemberId.value) {
      const member = members.value.find((item) => item.id === modalMemberId.value)
      if (!member) return
      await membersStore.update(member, { username: memberUsername.value.trim() })
      closeModal()
    } else {
      const shouldClose = await createOrPromptMember()
      if (shouldClose) closeModal()
    }
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}

async function createOrPromptMember() {
  try {
    const response = await membersStore.create(groupId, memberUsername.value.trim())
    if (response.outcome === 'invite_sent') {
      snackbarStore.push(strings.value.pendingInviteLabel, 'info')
    }
    return true
  } catch (error) {
    if (isUsernameNotFoundError(error)) {
      isInlineCreateMode.value = true
      inlineCreateError.value = ''
      inlineCreateName.value = ''
      dismissSuggestions()
      return false
    }
    throw error
  }
}

async function createMissingUserAndAddMember() {
  inlineCreateError.value = ''

  if (!inlineCreateName.value.trim()) {
    inlineCreateError.value = strings.value.nameRequired
    return
  }
  if (!memberUsername.value.trim()) {
    inlineCreateError.value = strings.value.usernameRequired
    return
  }
  if (!inlineCreatePassword.value) {
    inlineCreateError.value = strings.value.passwordRequired
    return
  }
  if (inlineCreatePassword.value.length < 8) {
    inlineCreateError.value = strings.value.passwordTooShort
    return
  }

  isInlineCreateSubmitting.value = true
  try {
    const response = await membersStore.inlineCreate({
      group_id: groupId,
      name: inlineCreateName.value.trim(),
      username: memberUsername.value.trim(),
      password: inlineCreatePassword.value,
      phone_number: inlineCreatePhoneNumber.value.trim() || null,
      is_archived: false,
    })
    const successMessage = inlineCreatePhoneNumber.value.trim()
      ? `${strings.value.memberCreateSuccess} پیامک تکمیل ثبت‌نام ارسال شد.`
      : strings.value.memberCreateSuccess
    snackbarStore.push(response.outcome === 'added' ? successMessage : strings.value.pendingInviteLabel, response.outcome === 'added' ? 'success' : 'info')
    closeModal()
  } catch (error) {
    inlineCreateError.value = resolveInlineCreateError(error)
  } finally {
    isInlineCreateSubmitting.value = false
  }
}

function fillDefaultPassword() {
  inlineCreatePassword.value = '12345678'
}

function resolveInlineCreateError(error: unknown) {
  if (error instanceof TypeError) return strings.value.networkError
  if (error instanceof ApiError) {
    const payloadCode = readApiErrorCode(error)
    if (payloadCode === 'invalid_name') return strings.value.nameRequired
    if (payloadCode === 'invalid_username') return strings.value.usernameRequired
    if (payloadCode === 'weak_password') return strings.value.passwordTooShort
    if (payloadCode === 'username_taken') return strings.value.usernameTaken
    if (payloadCode === 'already_member') return strings.value.memberCreateSuccess
  }
  return error instanceof Error ? error.message : strings.value.memberCreateFailed
}

function readApiErrorCode(error: ApiError) {
  if (!error.payload || typeof error.payload !== 'object') return null
  const payload = error.payload as { error?: { code?: string } }
  return typeof payload.error?.code === 'string' ? payload.error.code : null
}

function isUsernameNotFoundError(error: unknown) {
  return error instanceof ApiError && readApiErrorCode(error) === 'username_not_found'
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
    <div v-if="!(isInlineCreateMode && isCreateMode)" class="form-field">
      <label class="form-field__label">{{ strings.memberPlaceholder }}</label>
      <div class="member-suggestion-field">
        <input
          v-model="memberUsername"
          class="text-input"
          type="text"
          autocapitalize="off"
          autocomplete="off"
          :disabled="isModalBusy"
          :aria-expanded="isCreateMode && suggestions.length > 0 ? 'true' : 'false'"
          aria-autocomplete="list"
          @input="updateCreateSuggestions"
          @keydown="onMemberInputKeydown"
        />
        <div v-if="isCreateMode" class="member-suggestion-panel">
          <p v-if="shouldShowSuggestionHint" class="member-suggestion-state">
            {{ strings.memberSuggestionHint }}
          </p>
          <p v-else-if="isSuggestionLoading" class="member-suggestion-state">
            {{ strings.memberSuggestionLoading }}
          </p>
          <p v-else-if="memberSuggestionError" class="member-suggestion-state member-suggestion-state--error">
            {{ strings.memberSuggestionError }}
          </p>
          <div v-else-if="shouldShowNoSuggestionResults" class="member-inline-create__info">
            <strong>{{ strings.memberCreatePromptTitle }}</strong>
            <p>{{ strings.memberCreatePromptSubtitle }}</p>
          </div>
          <div v-else-if="suggestions.length > 0" class="member-suggestion-list" role="listbox">
            <button
              v-for="(suggestion, index) in suggestions"
              :key="suggestion.id"
              class="member-suggestion-option"
              :class="{ 'member-suggestion-option--active': index === activeIndex }"
              type="button"
              @mousedown.prevent="applySuggestion(suggestion)"
              @mouseenter="setActiveIndex(index)"
            >
              <span class="member-suggestion-option__username">@{{ suggestion.username }}</span>
              <span v-if="suggestion.name" class="member-suggestion-option__name">{{ suggestion.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="isInlineCreateMode && isCreateMode" class="member-inline-create">
      <div class="form-field">
        <label class="form-field__label">{{ strings.memberCreateNameLabel }}</label>
        <input v-model="inlineCreateName" class="text-input" type="text" :disabled="isModalBusy" />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.memberCreateUsernameLabel }}</label>
        <input v-model="memberUsername" class="text-input" type="text" autocapitalize="off" :disabled="isModalBusy" />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.accountPhoneLabel }} (اختیاری)</label>
        <input
          v-model.trim="inlineCreatePhoneNumber"
          class="text-input"
          type="text"
          inputmode="numeric"
          autocomplete="tel"
          placeholder="09120000000"
          :disabled="isModalBusy"
        />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.memberCreatePasswordLabel }}</label>
        <PasswordField
          v-model="inlineCreatePassword"
          autocomplete="new-password"
          :disabled="isModalBusy"
          :show-label="strings.showPasswordLabel"
          :hide-label="strings.hidePasswordLabel"
        />
      </div>
      <button class="outline-button member-inline-create__default" type="button" :disabled="isModalBusy" @click="fillDefaultPassword">
        {{ strings.memberCreateDefaultPassword }}
      </button>
      <p v-if="inlineCreateError" class="member-suggestion-state member-suggestion-state--error">{{ inlineCreateError }}</p>
    </div>
    <div class="modal-actions">
      <button class="outline-button" type="button" style="flex: 1;" :disabled="isModalBusy" @click="closeModal">{{ strings.cancel }}</button>
      <button
        class="filled-button"
        type="button"
        style="flex: 1; height: 48px;"
        :disabled="isModalBusy"
        @click="isInlineCreateMode && isCreateMode ? createMissingUserAndAddMember() : saveMember()"
      >
        {{ modalPrimaryActionLabel }}
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.member-suggestion-field {
  display: grid;
  gap: 10px;
}

.member-suggestion-panel {
  display: grid;
  gap: 8px;
}

.member-suggestion-state {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.member-suggestion-state--error {
  color: var(--color-danger, #b42318);
}

.member-suggestion-list {
  display: grid;
  gap: 8px;
}

.member-suggestion-option {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--color-primary) 12%, var(--color-border));
  border-radius: 16px;
  background: color-mix(in srgb, var(--color-surface) 92%, white);
  padding: 12px 14px;
  text-align: left;
  display: grid;
  gap: 4px;
  transition: border-color 0.18s ease, transform 0.18s ease, background-color 0.18s ease;
}

.member-suggestion-option--active {
  border-color: color-mix(in srgb, var(--color-primary) 55%, white);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  transform: translateY(-1px);
}

.member-suggestion-option__username {
  font-weight: 700;
  color: var(--color-text-primary);
}

.member-suggestion-option__name {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.member-inline-create {
  display: grid;
  gap: 12px;
  padding-top: 6px;
}

.member-inline-create__default {
  width: 100%;
}

.member-inline-create__info {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
}

.member-inline-create__info p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
</style>
