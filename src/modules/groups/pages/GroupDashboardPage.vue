<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import InlineAlert from '@/shared/components/InlineAlert.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import SummaryGrid from '@/shared/components/SummaryGrid.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import AmountText from '@/shared/components/AmountText.vue'
import TransferFlow from '@/shared/components/TransferFlow.vue'
import { useGroupsStore } from '@/modules/groups/store'
import { useMembersStore } from '@/modules/members/store'
import { useExpensesStore } from '@/modules/expenses/store'
import { useSettlementsStore } from '@/modules/settlements/store'
import { useBalancesStore } from '@/modules/balances/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { formatAmount, formatCompactCount } from '@/shared/utils/format'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string
const groupsStore = useGroupsStore()
const membersStore = useMembersStore()
const expensesStore = useExpensesStore()
const settlementsStore = useSettlementsStore()
const balancesStore = useBalancesStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()

const { strings, language } = storeToRefs(settingsStore)
const { groups } = storeToRefs(groupsStore)
const { byGroupId: membersByGroupId } = storeToRefs(membersStore)
const { byGroupId: expensesByGroupId } = storeToRefs(expensesStore)
const { byGroupId: settlementsByGroupId } = storeToRefs(settlementsStore)
const { byGroupId: balancesByGroupId } = storeToRefs(balancesStore)

const group = computed(() => groups.value.find((item) => item.id === groupId))
const members = computed(() => membersByGroupId.value[groupId] ?? [])
const expenses = computed(() => expensesByGroupId.value[groupId] ?? [])
const settlements = computed(() => settlementsByGroupId.value[groupId] ?? [])
const canCreateTransactions = computed(() => members.value.length >= 2)

const summaryItems = computed(() => {
  const openBalancesMembers = new Set<string>()
  for (const expense of expenses.value) {
    expense.payers.forEach((item) => openBalancesMembers.add(item.member_id))
    expense.shares.forEach((item) => openBalancesMembers.add(item.member_id))
  }

  return [
    { label: strings.value.totalExpenseLabel, amount: expenses.value.reduce((sum, item) => sum + item.total_amount, 0) },
    { label: strings.value.membersLabel, value: formatCompactCount(members.value.length, language.value) },
    { label: strings.value.settlementsLabel, amount: settlements.value.reduce((sum, item) => sum + item.amount, 0) },
    {
      label: strings.value.openBalancesLabel,
      value: formatCompactCount(
        balancesByGroupId.value[groupId]?.balances.filter((item) => item.net_balance !== 0).length ?? openBalancesMembers.size,
        language.value,
      ),
    },
  ]
})

const memberName = (memberId: string) => members.value.find((item) => item.id === memberId)?.username ?? `${strings.value.membersLabel} ${memberId}`
onMounted(async () => {
  try {
    if (groups.value.length === 0) await groupsStore.load()
    await Promise.all([
      membersStore.load(groupId),
      expensesStore.load(groupId),
      settlementsStore.load(groupId),
      balancesStore.load(groupId),
    ])
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
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
</script>

<template>
  <div class="page-shell page-stack">
    <PageTopBar :title="group?.name ?? strings.groupFallbackTitle" can-go-back @back="router.back()" />
    <HeroCard :title="strings.groupOverviewTitle" :subtitle="strings.groupOverviewSubtitle" icon="▣" />
    <SummaryGrid :items="summaryItems" :language="language" />
    <InlineAlert
      v-if="!canCreateTransactions"
      :title="strings.membersAction"
      :message="strings.needSecondMemberMessage"
    />

    <div class="action-grid stagger-list">
      <button class="action-card" type="button" @click="router.push(`/groups/${groupId}/members`)">
        <span class="action-card__icon">◎</span>
        <span class="action-card__title">{{ strings.membersAction }}</span>
      </button>
      <button class="action-card" :class="{ 'is-disabled': !canCreateTransactions }" type="button" @click="openExpenseEditor">
        <span class="action-card__icon">＋</span>
        <span class="action-card__title">{{ strings.newExpenseAction }}</span>
      </button>
      <button class="action-card" :class="{ 'is-disabled': !canCreateTransactions }" type="button" @click="openSettlementEditor">
        <span class="action-card__icon">↺</span>
        <span class="action-card__title">{{ strings.addSettlementAction }}</span>
      </button>
      <button class="action-card" type="button" @click="router.push(`/groups/${groupId}/balances`)">
        <span class="action-card__icon">⇄</span>
        <span class="action-card__title">{{ strings.balancesAction }}</span>
      </button>
    </div>

    <SectionHeader :title="strings.recentExpensesTitle" />
    <TransitionGroup name="feature-transition" tag="div" class="list-stack">
      <article
        v-for="expense in expenses.slice(0, 8)"
        :key="expense.id"
        class="surface-card surface-card--flat"
        style="cursor: pointer;"
        @click="router.push(`/groups/${groupId}/expense/${expense.id}`)"
      >
        <div class="detail-line detail-line--start">
          <div class="page-topbar__title" style="font-size: 16px;">{{ expense.title }}</div>
          <AmountText :amount="expense.total_amount" :language="language" tone="primary" />
        </div>
        <div class="muted">{{ expense.note || strings.noDescription }}</div>
        <div class="chip-row" style="margin-top: 10px;">
          <div class="chip">
            {{
              expense.payers
                .map((payer) => memberName(payer.member_id))
                .join(language === 'fa' ? '، ' : ', ')
            }}
          </div>
        </div>
      </article>
      <EmptyStateCard v-if="expenses.length === 0" :title="strings.noExpensesTitle" :subtitle="strings.noExpensesSubtitle" />
    </TransitionGroup>

    <SectionHeader :title="strings.recentSettlementsTitle" />
    <TransitionGroup name="feature-transition" tag="div" class="list-stack">
      <article v-for="settlement in settlements.slice(0, 8)" :key="settlement.id" class="surface-card surface-card--flat">
        <div class="detail-line detail-line--start">
          <TransferFlow
            class="page-topbar__title"
            style="font-size: 16px;"
            :from="memberName(settlement.from_member_id)"
            :to="memberName(settlement.to_member_id)"
          />
          <AmountText :amount="settlement.amount" :language="language" tone="success" />
        </div>
        <div class="muted">{{ settlement.note || strings.noDescription }}</div>
        <div class="card-actions settlement-card-actions" style="margin-top: 10px;">
          <button class="outline-button" type="button" @click="router.push(`/groups/${groupId}/settlement/${settlement.id}/edit`)">
            {{ strings.edit }}
          </button>
          <button class="outline-button is-danger" type="button" @click="removeSettlement(settlement.id)">
            {{ strings.delete }}
          </button>
        </div>
      </article>
      <EmptyStateCard v-if="settlements.length === 0" :title="strings.noSettlementsTitle" :subtitle="strings.noSettlementsSubtitle" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.is-disabled {
  opacity: 0.6;
}
</style>
