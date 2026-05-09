<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import AmountText from '@/shared/components/AmountText.vue'
import Avatar from '@/shared/components/Avatar.vue'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'
import Icon from '@/shared/components/Icon.vue'
import { deriveGroupBalances, projectMemberBreakdown, type MemberBreakdownEntry } from '@/modules/balances/groupBalances'
import { useGroupsStore } from '@/modules/groups/store'
import { useMembersStore } from '@/modules/members/store'
import { useExpensesStore } from '@/modules/expenses/store'
import { useSettlementsStore } from '@/modules/settlements/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string

const groupsStore = useGroupsStore()
const membersStore = useMembersStore()
const expensesStore = useExpensesStore()
const settlementsStore = useSettlementsStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()

const { strings, language } = storeToRefs(settingsStore)
const { groups } = storeToRefs(groupsStore)
const { byGroupId: membersByGroupId } = storeToRefs(membersStore)
const { byGroupId: expensesByGroupId } = storeToRefs(expensesStore)
const { byGroupId: settlementsByGroupId } = storeToRefs(settlementsStore)

const group = computed(() => groups.value.find((item) => item.id === groupId))
const members = computed(() => membersByGroupId.value[groupId] ?? [])
const expenses = computed(() => expensesByGroupId.value[groupId] ?? [])
const settlements = computed(() => settlementsByGroupId.value[groupId] ?? [])
const balanceResponse = computed(() => deriveGroupBalances({
  groupId,
  expenses: expenses.value,
  settlements: settlements.value,
  members: members.value,
}))
const memberName = (memberId: string) => members.value.find((item) => item.id === memberId)?.username ?? memberId

const expandedMemberId = ref<string | null>(null)

function toggleExpanded(memberId: string) {
  expandedMemberId.value = expandedMemberId.value === memberId ? null : memberId
}

function breakdownFor(memberId: string, netBalance: number): MemberBreakdownEntry[] {
  return projectMemberBreakdown(memberId, netBalance, balanceResponse.value?.simplified_debts ?? [])
}

function goToSuggestedSettlement(transfer: { from_member_id: string; to_member_id: string; amount: number }) {
  router.push({
    path: `/groups/${groupId}/settlement/new`,
    query: {
      from: transfer.from_member_id,
      to: transfer.to_member_id,
      amount: String(transfer.amount),
    },
  })
}

function payBreakdownEntry(entry: MemberBreakdownEntry, event: Event) {
  event.stopPropagation()
  goToSuggestedSettlement(entry.transfer)
}

onMounted(async () => {
  try {
    if (groups.value.length === 0) await groupsStore.load()
    await Promise.all([
      membersStore.load(groupId),
      expensesStore.load(groupId),
      settlementsStore.load(groupId),
    ])
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
})
</script>

<template>
  <div class="page-shell page-stack balances-page">
    <PageTopBar :title="`${strings.balancesPrefix} ${group?.name ?? ''}`" can-go-back sticky @back="router.back()" />

    <!-- Top header text -->
    <div class="balances-head">
      <div class="balances-head__sub">{{ strings.suggestedPaymentsTitle }}</div>
      <div class="balances-head__title">{{ strings.optimizePaymentsSubtitle }}</div>
    </div>

    <!-- Suggested chain -->
    <div class="suggested-stack">
        <button
          v-for="transfer in balanceResponse?.simplified_debts ?? []"
          :key="`${transfer.from_member_id}-${transfer.to_member_id}`"
          class="suggested-row"
          type="button"
          @click="goToSuggestedSettlement(transfer)"
        >
          <Avatar :name="memberName(transfer.from_member_id)" tone="accent" :size="36" />
          <span class="suggested-row__arrow suggested-arrow" aria-hidden="true">
            <Icon name="arrow-right" :size="16" />
          </span>
          <Avatar :name="memberName(transfer.to_member_id)" tone="brand" :size="36" />
          <span class="suggested-row__meta">
            <strong><UsernameHandle :username="memberName(transfer.from_member_id)" /></strong>
            <span class="muted"><UsernameHandle :username="memberName(transfer.to_member_id)" /></span>
          </span>
          <span class="suggested-row__amount">
            <AmountText :amount="transfer.amount" :language="language" tone="primary" size="md" />
          </span>
        </button>
        <EmptyStateCard
          v-if="(balanceResponse?.simplified_debts?.length ?? 0) === 0"
          :title="strings.allSettledTitle"
          :subtitle="strings.allSettledSubtitle"
          icon="✓"
        />
      </div>

    <!-- Per member -->
    <div class="member-list-eyebrow">
      <h3 class="eyebrow">{{ strings.memberBalanceTitle }}</h3>
      <span class="member-list-eyebrow__hint">{{ strings.tapForBreakdown }}</span>
    </div>
    <div class="member-list-card">
      <template v-for="balance in balanceResponse?.balances ?? []" :key="balance.member_id">
        <component
          :is="balance.net_balance === 0 ? 'div' : 'button'"
          :type="balance.net_balance === 0 ? undefined : 'button'"
          class="member-row"
          :class="{ 'is-expanded': expandedMemberId === balance.member_id }"
          :aria-expanded="balance.net_balance === 0 ? undefined : (expandedMemberId === balance.member_id)"
          @click="balance.net_balance === 0 ? null : toggleExpanded(balance.member_id)"
        >
          <Avatar
            :name="balance.member_name"
            :tone="balance.net_balance > 0 ? 'brand' : balance.net_balance < 0 ? 'accent' : 'settled'"
            :size="36"
          />
          <div class="member-row__body">
            <strong><UsernameHandle :username="balance.member_name" /></strong>
            <span
              class="member-row__label"
              :class="{
                'is-pos': balance.net_balance > 0,
                'is-neg': balance.net_balance < 0,
                'is-settled': balance.net_balance === 0,
              }"
            >
              {{
                balance.net_balance > 0
                  ? strings.creditorLabel
                  : balance.net_balance < 0
                    ? strings.debtorLabel
                    : strings.settledLabel
              }}
            </span>
          </div>
          <div
            class="member-row__amount num"
            :class="{
              'is-pos': balance.net_balance > 0,
              'is-neg': balance.net_balance < 0,
              'is-settled': balance.net_balance === 0,
            }"
          >
            <span v-if="balance.net_balance === 0">—</span>
            <template v-else>
              <span class="member-row__amount-sign">{{ balance.net_balance > 0 ? '+' : '−' }}</span>
              <AmountText
                :amount="Math.abs(balance.net_balance)"
                :language="language"
                :tone="balance.net_balance > 0 ? 'success' : 'danger'"
              />
            </template>
          </div>
          <span
            v-if="balance.net_balance !== 0"
            class="member-row__chevron"
            :class="{ 'is-open': expandedMemberId === balance.member_id }"
            aria-hidden="true"
          >
            <Icon name="chevron-down" :size="14" />
          </span>
        </component>
        <div
          v-if="expandedMemberId === balance.member_id && breakdownFor(balance.member_id, balance.net_balance).length > 0"
          class="breakdown-panel"
        >
          <div class="breakdown-panel__title">
            {{ balance.net_balance > 0 ? strings.breakdownOwedByTitle : strings.breakdownOwesToTitle }}
          </div>
          <div class="breakdown-panel__list">
            <div
              v-for="entry in breakdownFor(balance.member_id, balance.net_balance)"
              :key="`${entry.transfer.from_member_id}-${entry.transfer.to_member_id}`"
              class="breakdown-row"
            >
              <Avatar
                :name="memberName(entry.other_member_id)"
                :tone="entry.kind === 'incoming' ? 'accent' : 'brand'"
                :size="28"
              />
              <div class="breakdown-row__body">
                <strong><UsernameHandle :username="memberName(entry.other_member_id)" /></strong>
              </div>
              <div
                class="breakdown-row__amount num"
                :class="{ 'is-pos': entry.kind === 'incoming', 'is-neg': entry.kind === 'outgoing' }"
              >
                <span class="breakdown-row__amount-sign">{{ entry.kind === 'incoming' ? '+' : '−' }}</span>
                <AmountText
                  :amount="entry.transfer.amount"
                  :language="language"
                  :tone="entry.kind === 'incoming' ? 'success' : 'danger'"
                />
              </div>
              <button
                type="button"
                class="breakdown-row__pay"
                @click="payBreakdownEntry(entry, $event)"
              >
                {{ strings.dashboardSettleUpAction }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.balances-page { padding-top: 2px; }

.balances-head {
  margin-bottom: var(--s-2);
}
.balances-head__sub {
  font-size: var(--t-label);
  color: var(--fg-muted);
  margin-bottom: var(--s-4);
}
.balances-head__title {
  font-size: var(--t-title);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.01em;
}

.suggested-stack {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-2xl);
  overflow: hidden;
}
.suggested-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-4);
  background: transparent;
  border: 0;
  cursor: pointer;
  border-bottom: 1px solid var(--divider);
  text-align: start;
}
.suggested-row:last-of-type { border-bottom: 0; }
.suggested-row:hover { background: var(--hover); }
.suggested-row__arrow {
  color: var(--fg-subtle);
  display: inline-flex;
}
.suggested-row__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.suggested-row__meta strong {
  font-size: var(--t-label);
  font-weight: var(--fw-medium);
}
.suggested-row__meta .muted {
  font-size: 11px;
  color: var(--fg-subtle);
}
.suggested-row__amount {
  font-weight: var(--fw-semibold);
}

/* Per-member list — single bordered card */
.member-list-eyebrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  margin-bottom: var(--s-2);
}
.member-list-eyebrow .eyebrow { margin: 0; }
.member-list-eyebrow__hint {
  font-size: 11px;
  color: var(--fg-subtle);
}
.member-list-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  overflow: hidden;
}
.member-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: 14px 16px;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: start;
  transition: background var(--d-fast) var(--ease-standard);
}
.member-row + .member-row,
.member-row + .breakdown-panel,
.breakdown-panel + .member-row {
  border-top: 1px solid var(--divider);
}
div.member-row { cursor: default; }
.member-row:hover:not(div) { background: var(--hover); }
.member-row.is-expanded { background: var(--surface-sunk); }
.member-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.member-row__body strong {
  font-size: 14px;
  font-weight: var(--fw-medium);
}
.member-row__label {
  font-size: 11px;
  font-weight: var(--fw-medium);
}
.member-row__label.is-pos { color: var(--pos); }
.member-row__label.is-neg { color: var(--neg); }
.member-row__label.is-settled { color: var(--fg-subtle); }
.member-row__amount {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.member-row__amount.is-pos { color: var(--pos); }
.member-row__amount.is-neg { color: var(--neg); }
.member-row__amount.is-settled { color: var(--fg-subtle); font-weight: var(--fw-regular); }
.member-row__amount-sign {
  font-weight: 700;
}
.member-row__chevron {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--surface-sunk);
  color: var(--fg-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--d-fast) var(--ease-standard);
}
.member-row.is-expanded .member-row__chevron,
.member-row__chevron.is-open { transform: rotate(180deg); }

/* Breakdown panel */
.breakdown-panel {
  padding: 0 16px 16px;
  background: var(--surface-sunk);
}
.breakdown-panel__title {
  font-size: 11px;
  color: var(--fg-subtle);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-top: 4px;
  margin-bottom: 10px;
}
.breakdown-panel__list {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
}
.breakdown-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
}
.breakdown-row:last-child { border-bottom: 0; }
.breakdown-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}
.breakdown-row__body strong {
  font-size: 13px;
  font-weight: var(--fw-medium);
}
.breakdown-row__amount {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-size: 14px;
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}
.breakdown-row__amount.is-pos { color: var(--pos); }
.breakdown-row__amount.is-neg { color: var(--neg); }
.breakdown-row__amount-sign { font-weight: 600; }
.breakdown-row__pay {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  background: var(--brand-soft);
  color: var(--brand);
  border: 0;
  border-radius: var(--r-pill);
  cursor: pointer;
}
.breakdown-row__pay:hover { background: color-mix(in srgb, var(--brand-soft) 70%, var(--brand) 30%); }
</style>
