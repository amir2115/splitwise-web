<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import InlineAlert from '@/shared/components/InlineAlert.vue'
import AmountText from '@/shared/components/AmountText.vue'
import Avatar from '@/shared/components/Avatar.vue'
import { useMembersStore } from '@/modules/members/store'
import { useSettlementsStore } from '@/modules/settlements/store'
import { useBalancesStore } from '@/modules/balances/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { digitsOnly, formatAmountInput, parseAmountInput, isAmountOverflow } from '@/shared/utils/format'
import { translateMessageKey } from '@/shared/i18n/strings'
import { resolveAppErrorMessage } from '@/shared/utils/apiErrors'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'
import Icon from '@/shared/components/Icon.vue'

type SlotRole = 'from' | 'to'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string
const settlementId = route.params.settlementId as string | undefined
const isEdit = computed(() => Boolean(settlementId))

const membersStore = useMembersStore()
const settlementsStore = useSettlementsStore()
const balancesStore = useBalancesStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()

const { strings, language } = storeToRefs(settingsStore)
const { byGroupId: membersByGroupId } = storeToRefs(membersStore)
const { byGroupId: settlementsByGroupId } = storeToRefs(settlementsStore)

const members = computed(() => membersByGroupId.value[groupId] ?? [])
const settlement = computed(() => (settlementsByGroupId.value[groupId] ?? []).find((item) => item.id === settlementId))
const balanceResponse = computed(() => balancesStore.byGroupId[groupId])
const errorMessage = ref('')
const isSaving = ref(false)
const prefilledSuggestedAmount = computed(() => parseAmountInput(String(route.query.amount ?? '')))

const form = reactive({
  from_member_id: '',
  to_member_id: '',
  amountInput: '',
  note: '',
})

const activeStep = ref<SlotRole>('from')
const searchQuery = ref('')

onMounted(async () => {
  try {
    await Promise.all([membersStore.load(groupId), settlementsStore.load(groupId), balancesStore.load(groupId)])
    if (settlement.value) {
      form.from_member_id = settlement.value.from_member_id
      form.to_member_id = settlement.value.to_member_id
      form.amountInput = String(settlement.value.amount)
      form.note = settlement.value.note ?? ''
      activeStep.value = 'from'
    } else {
      form.from_member_id = String(route.query.from ?? members.value[0]?.id ?? '')
      form.to_member_id = String(route.query.to ?? members.value[1]?.id ?? members.value[0]?.id ?? '')
      form.amountInput = prefilledSuggestedAmount.value > 0 ? String(prefilledSuggestedAmount.value) : ''
      activeStep.value = route.query.to ? 'to' : 'from'
    }
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
})

const suggestedAmount = computed(() => {
  if (prefilledSuggestedAmount.value > 0 && form.from_member_id === String(route.query.from ?? '') && form.to_member_id === String(route.query.to ?? '')) {
    return prefilledSuggestedAmount.value
  }
  return balanceResponse.value?.simplified_debts.find((item) => item.from_member_id === form.from_member_id && item.to_member_id === form.to_member_id)?.amount ?? 0
})

const fromMember = computed(() => members.value.find((m) => m.id === form.from_member_id))
const toMember = computed(() => members.value.find((m) => m.id === form.to_member_id))
const otherSlotMemberId = computed(() => activeStep.value === 'from' ? form.to_member_id : form.from_member_id)

const filteredMembers = computed(() => {
  const otherSlot = otherSlotMemberId.value
  const query = searchQuery.value.trim().toLowerCase()
  return members.value
    .filter((m) => m.id !== otherSlot)
    .filter((m) => !query || m.username.toLowerCase().includes(query))
})

const recentMembers = computed(() => {
  const otherSlot = otherSlotMemberId.value
  const recents = new Set<string>()
  const settlementsList = settlementsByGroupId.value[groupId] ?? []
  ;[...settlementsList]
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .forEach((s) => {
      const counterpart = activeStep.value === 'from' ? s.from_member_id : s.to_member_id
      if (!counterpart || counterpart === otherSlot) return
      recents.add(counterpart)
    })
  return Array.from(recents)
    .map((id) => members.value.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .slice(0, 4)
})

function balanceHintFor(memberId: string): { kind: 'owes' | 'owed' | 'settled'; amount: number } {
  const balance = balanceResponse.value?.balances.find((b) => b.member_id === memberId)
  if (!balance || balance.net_balance === 0) return { kind: 'settled', amount: 0 }
  if (balance.net_balance > 0) return { kind: 'owed', amount: balance.net_balance }
  return { kind: 'owes', amount: Math.abs(balance.net_balance) }
}

function focusSlot(slot: SlotRole) {
  activeStep.value = slot
  searchQuery.value = ''
}

function selectMember(memberId: string) {
  if (activeStep.value === 'from') {
    form.from_member_id = memberId
    if (form.to_member_id === memberId) form.to_member_id = ''
    activeStep.value = 'to'
    searchQuery.value = ''
  } else {
    form.to_member_id = memberId
    if (form.from_member_id === memberId) form.from_member_id = ''
    if (!form.from_member_id) {
      activeStep.value = 'from'
      searchQuery.value = ''
    }
  }
}

function swap() {
  const previousFrom = form.from_member_id
  form.from_member_id = form.to_member_id
  form.to_member_id = previousFrom
}

function fillSuggestedAmount() {
  if (suggestedAmount.value > 0) form.amountInput = String(suggestedAmount.value)
}

async function submit() {
  errorMessage.value = ''
  if (isAmountOverflow(form.amountInput)) {
    errorMessage.value = strings.value.amountTooLarge
    return
  }
  const amount = parseAmountInput(form.amountInput)
  const messageKey =
    !form.from_member_id || !form.to_member_id
      ? 'SETTLEMENT_SELECT_TWO_MEMBERS'
      : form.from_member_id === form.to_member_id
        ? 'SETTLEMENT_MEMBERS_MUST_DIFFER'
        : amount <= 0
          ? 'SETTLEMENT_AMOUNT_POSITIVE'
          : null

  if (messageKey) {
    errorMessage.value = translateMessageKey(language.value, messageKey) ?? strings.value.genericError
    return
  }

  try {
    isSaving.value = true
    await settlementsStore.save({
      existingId: settlementId,
      group_id: groupId,
      from_member_id: form.from_member_id,
      to_member_id: form.to_member_id,
      amount,
      note: form.note.trim() || null,
    })
    snackbarStore.push(translateMessageKey(language.value, 'SETTLEMENT_SAVED') ?? strings.value.saveSettlement)
    router.back()
  } catch (error) {
    errorMessage.value = resolveAppErrorMessage(error, strings.value, language.value)
  } finally {
    isSaving.value = false
  }
}

async function removeSettlement() {
  if (!settlement.value || !window.confirm(strings.value.confirmDelete)) return
  try {
    await settlementsStore.remove(settlement.value)
    router.back()
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}
</script>

<template>
  <div class="page-shell page-stack settlement-page">
    <PageTopBar :title="isEdit ? strings.editSettlementTitle : strings.addSettlementTitle" can-go-back sticky @back="router.back()">
      <template #actions>
        <button class="filled-button filled-button--sm" type="button" :disabled="isSaving" @click="submit">
          <span v-if="isSaving" class="button-loader" aria-hidden="true"></span>
          {{ isEdit ? strings.save : strings.saveSettlement }}
        </button>
      </template>
    </PageTopBar>

    <Transition name="feature-transition">
      <InlineAlert v-if="errorMessage" :title="strings.formErrorTitle" :message="errorMessage" />
    </Transition>

    <!-- Step indicator -->
    <div class="settlement-step-indicator">
      <span :class="['settlement-step-indicator__label', { 'is-active': activeStep === 'from' }]">{{ strings.settlementStep1 }}</span>
      <span class="settlement-step-indicator__progress">
        <span class="settlement-step-indicator__progress-fill" :style="{ width: activeStep === 'to' ? '100%' : '50%' }" />
      </span>
      <span :class="['settlement-step-indicator__label', 'settlement-step-indicator__label--accent', { 'is-active': activeStep === 'to' }]">{{ strings.settlementStep2 }}</span>
    </div>

    <!-- Hero with two slots + centered swap -->
    <div class="settlement-hero">
      <div class="settlement-hero__slots">
        <button
          type="button"
          :class="['settlement-slot', 'settlement-slot--from', {
            'is-active': activeStep === 'from',
            'is-empty': !form.from_member_id,
          }]"
          @click="focusSlot('from')"
        >
          <span class="settlement-slot__avatar">
            <Avatar v-if="fromMember" :name="fromMember.username" tone="brand" :size="56" />
            <span v-else class="settlement-slot__avatar-empty" aria-hidden="true">
              <Icon name="plus" :size="20" />
            </span>
          </span>
          <span class="settlement-slot__role settlement-slot__role--from">{{ strings.payerLabel }}</span>
          <span class="settlement-slot__name">
            <UsernameHandle v-if="fromMember" :username="fromMember.username" />
            <span v-else class="settlement-slot__name-placeholder">{{ strings.settlementTapToPick }}</span>
          </span>
        </button>
        <button
          type="button"
          :class="['settlement-slot', 'settlement-slot--to', {
            'is-active': activeStep === 'to',
            'is-empty': !form.to_member_id,
          }]"
          @click="focusSlot('to')"
        >
          <span class="settlement-slot__avatar">
            <Avatar v-if="toMember" :name="toMember.username" tone="accent" :size="56" />
            <span v-else class="settlement-slot__avatar-empty" aria-hidden="true">
              <Icon name="plus" :size="20" />
            </span>
          </span>
          <span class="settlement-slot__role settlement-slot__role--to">{{ strings.receiverLabel }}</span>
          <span class="settlement-slot__name">
            <UsernameHandle v-if="toMember" :username="toMember.username" />
            <span v-else class="settlement-slot__name-placeholder">{{ strings.settlementTapToPick }}</span>
          </span>
        </button>
      </div>
      <button class="settlement-swap" type="button" :aria-label="strings.settlementSwapLabel" @click="swap">
        <Icon name="swap" :size="16" />
      </button>
    </div>

    <!-- Active picker -->
    <div class="picker-panel">
      <div class="picker-panel__header">
        <div :class="['picker-panel__role', activeStep === 'from' ? 'picker-panel__role--from' : 'picker-panel__role--to']">
          {{ activeStep === 'from' ? strings.settlementChoosePayer : strings.settlementChooseReceiver }}
        </div>
        <div class="picker-search">
          <Icon name="search" :size="16" class="picker-search__icon" />
          <input v-model="searchQuery" class="picker-search__input" :placeholder="strings.settlementSearchMember" :aria-label="strings.settlementSearchMember" />
          <span class="picker-search__count num">{{ filteredMembers.length }}</span>
        </div>
      </div>

      <div v-if="recentMembers.length > 0" class="picker-recent">
        <div class="picker-section-label">{{ strings.settlementRecentLabel }}</div>
        <div class="picker-recent__row">
          <button
            v-for="member in recentMembers"
            :key="`recent-${member.id}`"
            class="picker-recent__chip"
            type="button"
            @click="selectMember(member.id)"
          >
            <Avatar :name="member.username" :size="32" />
            <span class="picker-recent__chip-name"><UsernameHandle :username="member.username" /></span>
          </button>
        </div>
      </div>

      <div class="picker-list">
        <div class="picker-section-label">{{ strings.settlementAllMembersLabel }}</div>
        <button
          v-for="member in filteredMembers"
          :key="`pick-${member.id}`"
          class="picker-row"
          :class="{ 'is-selected': activeStep === 'from' ? form.from_member_id === member.id : form.to_member_id === member.id }"
          type="button"
          @click="selectMember(member.id)"
        >
          <Avatar :name="member.username" :size="38" />
          <div class="picker-row__body">
            <strong class="picker-row__name"><UsernameHandle :username="member.username" /></strong>
            <span
              class="picker-row__balance"
              :class="{
                'is-pos': balanceHintFor(member.id).kind === 'owed',
                'is-neg': balanceHintFor(member.id).kind === 'owes',
                'is-settled': balanceHintFor(member.id).kind === 'settled',
              }"
            >
              <template v-if="balanceHintFor(member.id).kind === 'settled'">{{ strings.settlementMemberSettledLabel }}</template>
              <template v-else>
                {{ balanceHintFor(member.id).kind === 'owed' ? strings.settlementMemberOwedLabel : strings.settlementMemberOwesLabel }}
                <span class="num">{{ formatAmountInput(String(balanceHintFor(member.id).amount), language) }}</span>
              </template>
            </span>
          </div>
          <span class="picker-row__chevron suggested-arrow" aria-hidden="true">
            <Icon name="chevron-right" :size="14" />
          </span>
        </button>
        <div v-if="filteredMembers.length === 0" class="picker-list__empty">{{ strings.noMembersTitle }}</div>
      </div>
    </div>

    <!-- Amount block -->
    <div class="amount-block">
      <span class="amount-block__label">{{ strings.settlementAmountLabel }}</span>
      <div class="amount-block__row">
        <input
          :value="formatAmountInput(form.amountInput, language)"
          class="amount-block__input num"
          inputmode="numeric"
          :placeholder="language === 'fa' ? '۰' : '0'"
          @input="form.amountInput = digitsOnly(($event.target as HTMLInputElement).value)"
        />
        <span class="amount-block__suffix">{{ language === 'fa' ? 'تومان' : 'T' }}</span>
      </div>
      <button v-if="suggestedAmount > 0" type="button" class="amount-block__hint" @click="fillSuggestedAmount">
        <span class="amount-block__hint-dot" aria-hidden="true"></span>
        {{ strings.settlementSuggestedAmountHint }}
        ·
        <AmountText :amount="suggestedAmount" :language="language" tone="primary" />
      </button>
    </div>

    <!-- Note -->
    <div class="form-field">
      <label class="form-field__label">{{ strings.noteLabel }}</label>
      <textarea v-model="form.note" class="text-area" />
    </div>

    <button v-if="isEdit" class="outline-button is-danger" type="button" @click="removeSettlement">
      {{ strings.delete }}
    </button>
  </div>
</template>

<style scoped>
.settlement-page { padding-top: 2px; }

/* Step indicator */
.settlement-step-indicator {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  font-size: 11px;
  color: var(--fg-subtle);
}
.settlement-step-indicator__label {
  font-weight: var(--fw-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}
.settlement-step-indicator__label.is-active { color: var(--brand); }
.settlement-step-indicator__label--accent.is-active { color: var(--accent); }
.settlement-step-indicator__progress {
  flex: 1;
  height: 2px;
  background: var(--brand-soft);
  border-radius: 999px;
  position: relative;
  overflow: hidden;
}
.settlement-step-indicator__progress-fill {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: 0;
  height: 100%;
  background: var(--brand);
  border-radius: 999px;
  transition: width var(--d-base) var(--ease-standard);
}

/* Hero: two slots + swap button */
.settlement-hero {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: 14px;
  box-shadow: var(--shadow-1);
}
.settlement-hero__slots {
  display: flex;
  align-items: stretch;
  gap: 10px;
  min-width: 0;
}
.settlement-slot {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  background: transparent;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--r-lg);
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard), border-color var(--d-fast) var(--ease-standard);
}
.settlement-slot:not(.is-empty) {
  border: 1px solid var(--border);
}
.settlement-slot.is-active.settlement-slot--from {
  background: var(--brand-soft);
  border: 1.5px solid var(--brand);
}
.settlement-slot.is-active.settlement-slot--to {
  background: var(--accent-soft);
  border: 1.5px solid var(--accent);
}
.settlement-slot__avatar {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.settlement-slot__avatar-empty {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface-sunk);
  border: 1px dashed var(--border-strong);
  color: var(--fg-subtle);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.settlement-slot__role {
  font-size: 11px;
  font-weight: var(--fw-bold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 4px;
}
.settlement-slot__role--from { color: var(--brand); }
.settlement-slot__role--to { color: var(--accent); }
.settlement-slot__name {
  font-size: 13px;
  font-weight: var(--fw-semibold);
  color: var(--fg);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.settlement-slot.is-empty .settlement-slot__name { color: var(--fg-subtle); }
.settlement-slot__name-placeholder {
  color: var(--fg-subtle);
  font-weight: var(--fw-medium);
}
.settlement-swap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--fg-muted);
  box-shadow: var(--shadow-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Picker panel */
.picker-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  overflow: hidden;
}
.picker-panel__header {
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--divider);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.picker-panel__role {
  font-size: 11px;
  font-weight: var(--fw-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.picker-panel__role--from { color: var(--brand); }
.picker-panel__role--to { color: var(--accent); }
.picker-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  min-width: 0;
}
.picker-search__icon {
  color: var(--fg-subtle);
  flex-shrink: 0;
}
.picker-search__input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  font-size: 14px;
  color: var(--fg);
  text-align: start;
  font-family: inherit;
}
.picker-search__input::placeholder { color: var(--fg-subtle); }
.picker-search__count {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg-subtle);
  border: 1px solid var(--border);
  font-family: var(--font-en);
  flex-shrink: 0;
}

.picker-recent {
  padding: 10px 16px;
  border-bottom: 1px solid var(--divider);
}
.picker-recent__row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.picker-recent__chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  flex-shrink: 0;
  min-width: 64px;
  cursor: pointer;
}
.picker-recent__chip-name {
  font-size: 11px;
  font-weight: var(--fw-medium);
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-section-label {
  padding: 10px 16px 4px;
  font-size: 10px;
  font-weight: var(--fw-semibold);
  color: var(--fg-subtle);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.picker-list {
  max-height: 320px;
  overflow-y: auto;
}
.picker-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--divider);
  cursor: pointer;
  text-align: start;
  transition: background var(--d-fast) var(--ease-standard);
  min-width: 0;
}
.picker-row:last-child { border-bottom: 0; }
.picker-row:hover { background: var(--hover); }
.picker-row.is-selected { background: var(--brand-soft); }
.picker-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.picker-row__name { font-size: 14px; font-weight: var(--fw-semibold); }
.picker-row__balance {
  font-size: 11px;
  font-weight: var(--fw-medium);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.picker-row__balance.is-pos { color: var(--pos); }
.picker-row__balance.is-neg { color: var(--neg); }
.picker-row__balance.is-settled { color: var(--fg-subtle); font-weight: var(--fw-regular); }
.picker-row__chevron {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--surface-sunk);
  color: var(--fg-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.picker-list__empty {
  padding: 20px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--fg-subtle);
}

/* Amount block */
.amount-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.amount-block__label {
  font-size: 12px;
  color: var(--fg-subtle);
}
.amount-block__row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.amount-block__input {
  flex: 1;
  min-width: 0;
  font-size: 32px;
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
  color: var(--brand);
  background: transparent;
  border: 0;
  outline: 0;
  padding: 0;
  text-align: start;
  line-height: 1;
}
.amount-block__suffix {
  font-size: 14px;
  font-weight: var(--fw-medium);
  color: var(--fg-muted);
  flex-shrink: 0;
}
.amount-block__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  font-size: 11px;
  color: var(--fg-muted);
  cursor: pointer;
  text-align: start;
  align-self: flex-start;
}
.amount-block__hint-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  flex-shrink: 0;
}
</style>
