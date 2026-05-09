<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import InlineAlert from '@/shared/components/InlineAlert.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import Avatar from '@/shared/components/Avatar.vue'
import GroupCardsSection from '@/modules/groupCards/components/GroupCardsSection.vue'
import PersonalBalancesSummary from '@/modules/balances/components/PersonalBalancesSummary.vue'
import { derivePersonalSimplifiedDebtSummary, buildSettlementDraftQuery, type PersonalSimplifiedDebtItem } from '@/modules/balances/personalSummary'
import { useGroupsStore } from '@/modules/groups/store'
import { useGroupCardsStore } from '@/modules/groupCards/store'
import { useMembersStore } from '@/modules/members/store'
import { useExpensesStore } from '@/modules/expenses/store'
import { useSettlementsStore } from '@/modules/settlements/store'
import { useBalancesStore } from '@/modules/balances/store'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { formatAmount } from '@/shared/utils/format'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'
import Icon from '@/shared/components/Icon.vue'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string
const authStore = useAuthStore()
const groupsStore = useGroupsStore()
const groupCardsStore = useGroupCardsStore()
const membersStore = useMembersStore()
const expensesStore = useExpensesStore()
const settlementsStore = useSettlementsStore()
const balancesStore = useBalancesStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()
const pageLoading = ref(true)
const expensesExpanded = ref(false)
const settlementsExpanded = ref(false)

const { strings, language } = storeToRefs(settingsStore)
const { groups } = storeToRefs(groupsStore)
const { byGroupId: groupCardsByGroupId } = storeToRefs(groupCardsStore)
const { byGroupId: membersByGroupId } = storeToRefs(membersStore)
const { byGroupId: expensesByGroupId } = storeToRefs(expensesStore)
const { byGroupId: settlementsByGroupId } = storeToRefs(settlementsStore)
const { byGroupId: balancesByGroupId } = storeToRefs(balancesStore)

const group = computed(() => groups.value.find((item) => item.id === groupId))
const groupCards = computed(() => groupCardsByGroupId.value[groupId] ?? [])
const members = computed(() => membersByGroupId.value[groupId] ?? [])
const expenses = computed(() => expensesByGroupId.value[groupId] ?? [])
const settlements = computed(() => settlementsByGroupId.value[groupId] ?? [])
const personalBalanceSummary = computed(() =>
  derivePersonalSimplifiedDebtSummary({
    members: members.value,
    simplifiedDebts: balancesByGroupId.value[groupId]?.simplified_debts ?? [],
    currentUserId: authStore.user?.id,
  }),
)
const hasLoadedGroupData = computed(() => !pageLoading.value)
const canCreateTransactions = computed(() => hasLoadedGroupData.value && members.value.length >= 2)
const initialVisibleItems = 4
const visibleExpenses = computed(() => (expensesExpanded.value ? expenses.value : expenses.value.slice(0, initialVisibleItems)))
const visibleSettlements = computed(() =>
  settlementsExpanded.value ? settlements.value : settlements.value.slice(0, initialVisibleItems),
)
const canExpandExpenses = computed(() => expenses.value.length > initialVisibleItems)
const canExpandSettlements = computed(() => settlements.value.length > initialVisibleItems)
const showMoreLabel = computed(() => (language.value === 'fa' ? 'مشاهده بیشتر' : 'Show more'))
const showLessLabel = computed(() => (language.value === 'fa' ? 'بستن' : 'Show less'))

// Personal net position
const personalNet = computed(() => {
  const me = members.value.find((m) => m.user_id != null && m.user_id === authStore.user?.id)
  if (!me) return { net: 0, paid: 0, owed: 0 }
  const myBalance = balancesByGroupId.value[groupId]?.balances.find((b) => b.member_id === me.id)
  if (myBalance) {
    return { net: myBalance.net_balance, paid: myBalance.paid_total, owed: myBalance.owed_total }
  }
  return { net: 0, paid: 0, owed: 0 }
})

const isRtl = computed(() => settingsStore.direction === 'rtl')
const memberSubtitle = computed(() => {
  const count = members.value.length
  if (language.value === 'fa') return `${count} عضو`
  return count === 1 ? '1 member' : `${count} members`
})

const heroState = computed<'owe' | 'receive' | 'settled'>(() => {
  if (personalNet.value.net > 0) return 'receive'
  if (personalNet.value.net < 0) return 'owe'
  return 'settled'
})
const heroLabel = computed(() => {
  if (heroState.value === 'receive') return strings.value.dashboardYouAreOwed
  if (heroState.value === 'owe') return strings.value.dashboardYouOwe
  return strings.value.dashboardEverythingSettled
})

const memberName = (memberId: string) => members.value.find((item) => item.id === memberId)?.username ?? `${strings.value.membersLabel} ${memberId}`

onMounted(async () => {
  try {
    if (groups.value.length === 0) await groupsStore.load()
    await Promise.all([
      groupCardsStore.load(groupId),
      membersStore.load(groupId),
      expensesStore.load(groupId),
      settlementsStore.load(groupId),
      balancesStore.load(groupId),
    ])
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  } finally {
    pageLoading.value = false
  }
})

async function removeSettlement(id: string) {
  if (!window.confirm(strings.value.confirmDelete)) return
  const settlement = settlements.value.find((item) => item.id === id)
  if (!settlement) return
  try {
    await settlementsStore.remove(settlement)
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}

function openExpenseEditor() {
  if (!canCreateTransactions.value) {
    snackbarStore.push(strings.value.needSecondMemberMessage, 'info')
    return
  }
  router.push(`/groups/${groupId}/expense/new`)
}

function openSettlementEditor() {
  if (!canCreateTransactions.value) {
    snackbarStore.push(strings.value.needSecondMemberMessage, 'info')
    return
  }
  router.push(`/groups/${groupId}/settlement/new`)
}

function openPersonalSettlement(item: PersonalSimplifiedDebtItem) {
  router.push({
    path: `/groups/${groupId}/settlement/new`,
    query: buildSettlementDraftQuery(item),
  })
}

function expensePayerNames(expense: typeof expenses.value[number]): string {
  return expense.payers
    .map((payer) => memberName(payer.member_id))
    .join(language.value === 'fa' ? '، ' : ', ')
}
</script>

<template>
  <div class="page-shell page-stack dashboard-page">
    <PageTopBar :title="group?.name ?? strings.groupFallbackTitle" can-go-back sticky @back="router.back()">
      <template #actions>
        <button
          class="dashboard-topbar-icon"
          type="button"
          :aria-label="strings.membersAction"
          @click="router.push(`/groups/${groupId}/members`)"
        >
          <Icon name="users" :size="16" />
        </button>
      </template>
    </PageTopBar>

    <!-- HERO: net position with breakdown rail -->
    <section class="net-hero" :class="{ 'is-loading': pageLoading }">
      <div class="net-hero__label">
        {{ pageLoading ? ' ' : `${heroLabel} · ${memberSubtitle}` }}
      </div>
      <div class="net-hero__amount" :class="`is-${heroState}`">
        <template v-if="pageLoading">
          <span class="dashboard-skel" style="width: 50%; height: 36px; border-radius: 10px;"></span>
        </template>
        <template v-else>
          <span class="num net-hero__amount-value">{{ formatAmount(Math.abs(personalNet.net), language) }}</span>
          <span class="net-hero__amount-currency">{{ language === 'fa' ? 'تومان' : 'T' }}</span>
        </template>
      </div>
      <div class="net-hero__split">
        <div class="net-hero__split-cell">
          <div class="net-hero__split-label">{{ strings.receivablesLabel }}</div>
          <div v-if="!pageLoading" class="net-hero__split-value is-pos num">{{ formatAmount(personalNet.paid, language) }}</div>
          <span v-else class="dashboard-skel" style="width: 60%; height: 16px;"></span>
        </div>
        <div class="net-hero__split-cell net-hero__split-cell--divider">
          <div class="net-hero__split-label">{{ strings.payablesLabel }}</div>
          <div v-if="!pageLoading" class="net-hero__split-value is-neg num">{{ formatAmount(personalNet.owed, language) }}</div>
          <span v-else class="dashboard-skel" style="width: 60%; height: 16px;"></span>
        </div>
      </div>
    </section>

    <InlineAlert
      v-if="hasLoadedGroupData && !canCreateTransactions"
      :title="strings.membersAction"
      :message="strings.needSecondMemberMessage"
      tone="info"
    />

    <!-- BALANCES summary (inline component) -->
    <h3 class="dashboard-eyebrow">{{ strings.balancesAction }}</h3>
    <PersonalBalancesSummary
      :summary="personalBalanceSummary"
      :members="members"
      :is-loading="pageLoading"
      :pay-label="strings.dashboardSettleUpAction"
      :settled-title="strings.dashboardEverythingSettled"
      :settled-subtitle="strings.allSettledSubtitle"
      :receive-label="strings.dashboardSettleUpAction"
      :pay-verb-label="strings.dashboardSettleUpAction"
      @pay="openPersonalSettlement"
    />
    <button class="dashboard-see-all" type="button" @click="router.push(`/groups/${groupId}/balances`)">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 4v16M6 20h12M5 10l2.5-5L10 10M14 10l2.5-5L19 10" />
      </svg>
      {{ strings.dashboardSeeAllBalances }}
    </button>

    <!-- QUICK ACTIONS — only 2 (members → toolbar, balances → component above) -->
    <div class="dashboard-actions">
      <button class="dashboard-action-card" :class="{ 'is-disabled': pageLoading || !canCreateTransactions }" type="button" @click="openExpenseEditor">
        <span class="dashboard-action-card__icon dashboard-action-card__icon--brand" aria-hidden="true">
          <Icon name="plus" :size="18" />
        </span>
        <span class="dashboard-action-card__title">{{ strings.newExpenseAction }}</span>
      </button>
      <button class="dashboard-action-card" :class="{ 'is-disabled': pageLoading || !canCreateTransactions }" type="button" @click="openSettlementEditor">
        <span class="dashboard-action-card__icon dashboard-action-card__icon--accent" aria-hidden="true">
          <Icon name="swap" :size="18" />
        </span>
        <span class="dashboard-action-card__title">{{ strings.addSettlementAction }}</span>
      </button>
    </div>

    <!-- Card numbers section -->
    <GroupCardsSection :group-id="groupId" :group-cards="groupCards" :members="members" :language="language" :strings="strings" />

    <!-- RECENT ACTIVITY: expenses -->
    <div class="activity-head">
      <h3 class="dashboard-eyebrow">{{ strings.recentExpensesTitle }}</h3>
      <button v-if="canExpandExpenses" class="dashboard-link" type="button" @click="expensesExpanded = !expensesExpanded">
        {{ expensesExpanded ? showLessLabel : showMoreLabel }}
      </button>
    </div>

    <TransitionGroup name="feature-transition" tag="div" class="activity-list">
      <div
        v-for="expense in visibleExpenses"
        :key="expense.id"
        class="activity-row"
        @click="router.push(`/groups/${groupId}/expense/${expense.id}`)"
      >
        <span class="activity-row__icon" aria-hidden="true">
          <Icon name="card" :size="18" />
        </span>
        <span class="activity-row__body">
          <span class="activity-row__title">{{ expense.title }}</span>
          <span class="activity-row__sub"><UsernameHandle :username="expensePayerNames(expense)" /></span>
        </span>
        <span class="activity-row__amount num">{{ formatAmount(expense.total_amount, language) }}</span>
      </div>
      <EmptyStateCard v-if="!pageLoading && expenses.length === 0" :title="strings.noExpensesTitle" :subtitle="strings.noExpensesSubtitle" />
    </TransitionGroup>

    <!-- RECENT ACTIVITY: settlements -->
    <div class="activity-head">
      <h3 class="dashboard-eyebrow">{{ strings.recentSettlementsTitle }}</h3>
      <button v-if="canExpandSettlements" class="dashboard-link" type="button" @click="settlementsExpanded = !settlementsExpanded">
        {{ settlementsExpanded ? showLessLabel : showMoreLabel }}
      </button>
    </div>

    <TransitionGroup name="feature-transition" tag="div" class="activity-list">
      <div
        v-for="settlement in visibleSettlements"
        :key="settlement.id"
        class="activity-row"
        @click="router.push(`/groups/${groupId}/settlement/${settlement.id}/edit`)"
      >
        <span class="activity-row__icon activity-row__icon--pos" aria-hidden="true">
          <Icon name="swap" :size="18" />
        </span>
        <span class="activity-row__body">
          <span class="activity-row__title"><UsernameHandle :username="memberName(settlement.from_member_id)" /> {{ isRtl ? '←' : '→' }} <UsernameHandle :username="memberName(settlement.to_member_id)" /></span>
          <span class="activity-row__sub">{{ settlement.note || strings.noDescription }}</span>
        </span>
        <span class="activity-row__amount num activity-row__amount--pos">{{ formatAmount(settlement.amount, language) }}</span>
        <button class="activity-row__trash" type="button" :aria-label="strings.delete" @click.stop="removeSettlement(settlement.id)">
          <Icon name="trash" :size="14" />
        </button>
      </div>
      <EmptyStateCard v-if="!pageLoading && settlements.length === 0" :title="strings.noSettlementsTitle" :subtitle="strings.noSettlementsSubtitle" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.dashboard-page { padding-top: 2px; }

/* Topbar action button — outline circle matching Swiply design */
.dashboard-topbar-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--fg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard), color var(--d-fast) var(--ease-standard);
}
.dashboard-topbar-icon:hover { background: var(--brand-soft); color: var(--brand); }

/* Eyebrow */
.dashboard-eyebrow {
  margin: var(--s-2) 0 var(--s-2);
  font-size: var(--t-caption);
  font-weight: var(--fw-medium);
  color: var(--fg-subtle);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* HERO net position — Swiply card */
.net-hero {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: 22px 22px 20px;
  box-shadow: var(--shadow-1);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.net-hero.is-loading .net-hero__amount { min-height: 44px; }
.net-hero__label {
  font-size: 13px;
  color: var(--fg-muted);
}
.net-hero__amount {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
  line-height: 1;
}
.net-hero__amount-value {
  font-size: 40px;
  font-weight: var(--fw-bold);
  letter-spacing: -0.03em;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
}
.net-hero__amount-currency {
  font-size: 16px;
  font-weight: var(--fw-medium);
  color: var(--fg-muted);
}
.net-hero__amount.is-receive .net-hero__amount-value { color: var(--pos); }
.net-hero__amount.is-owe .net-hero__amount-value { color: var(--neg); }
.net-hero__amount.is-settled .net-hero__amount-value { color: var(--fg); }

.net-hero__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--divider);
}
.net-hero__split-cell { display: flex; flex-direction: column; gap: 4px; }
.net-hero__split-cell--divider {
  padding-inline-start: 14px;
  border-inline-start: 1px solid var(--divider);
}
.net-hero__split-label {
  font-size: 11px;
  color: var(--fg-subtle);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.net-hero__split-value {
  font-size: 17px;
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}
.net-hero__split-value.is-pos { color: var(--pos); }
.net-hero__split-value.is-neg { color: var(--neg); }

/* See all balances link */
.dashboard-see-all {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px;
  font-size: 13px;
  color: var(--fg-muted);
  background: transparent;
  border: 0;
  cursor: pointer;
  margin-top: -4px;
  transition: color var(--d-fast) var(--ease-standard);
}
.dashboard-see-all:hover { color: var(--brand); }
.dashboard-see-all svg { color: inherit; }

/* Quick actions — 2 column grid */
.dashboard-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.dashboard-action-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  text-align: start;
  cursor: pointer;
  transition: transform var(--d-fast) var(--ease-standard), background var(--d-fast) var(--ease-standard), box-shadow var(--d-fast) var(--ease-standard);
}
[dir='rtl'] .dashboard-action-card { align-items: flex-end; }
.dashboard-action-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-2); }
.dashboard-action-card.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}
.dashboard-action-card__icon {
  width: 32px;
  height: 32px;
  border-radius: var(--r-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dashboard-action-card__icon--brand { background: var(--brand-soft); color: var(--brand); }
.dashboard-action-card__icon--accent { background: var(--accent-soft); color: var(--accent); }
.dashboard-action-card__title {
  font-weight: var(--fw-semibold);
  font-size: 15px;
  color: var(--fg);
}

/* Activity list */
.activity-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.dashboard-link {
  background: transparent;
  border: 0;
  color: var(--brand);
  font-size: var(--t-label);
  font-weight: var(--fw-medium);
  cursor: pointer;
}
.activity-list {
  display: flex;
  flex-direction: column;
}
.activity-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--divider);
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard);
}
.activity-row:last-of-type { border-bottom: 0; }
@media (hover: hover) {
  .activity-row:hover { background: color-mix(in srgb, var(--brand) 4%, transparent); }
}
.activity-row__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--r-md);
  background: var(--surface-sunk);
  color: var(--fg-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.activity-row__icon--pos {
  background: var(--pos-soft);
  color: var(--pos);
}
.activity-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.activity-row__title {
  font-weight: var(--fw-medium);
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.activity-row__sub {
  font-size: 12px;
  color: var(--fg-subtle);
}
.activity-row__amount {
  font-size: 14px;
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}
.activity-row__amount--pos { color: var(--pos); }
.activity-row__trash {
  background: transparent;
  border: 0;
  color: var(--fg-subtle);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--r-sm);
  transition: color var(--d-fast) var(--ease-standard), background var(--d-fast) var(--ease-standard);
}
.activity-row__trash:hover { color: var(--neg); background: var(--neg-soft); }

/* Skeleton */
.dashboard-skel {
  display: inline-block;
  background: linear-gradient(90deg, var(--surface-sunk), var(--surface-2), var(--surface-sunk));
  background-size: 200% 100%;
  animation: dash-shimmer 1.4s linear infinite;
  border-radius: var(--r-sm);
  height: 12px;
}
@keyframes dash-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
</style>
