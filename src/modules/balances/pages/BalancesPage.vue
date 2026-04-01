<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import AmountText from '@/shared/components/AmountText.vue'
import TransferFlow from '@/shared/components/TransferFlow.vue'
import { deriveGroupBalances } from '@/modules/balances/groupBalances'
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

const simplify = ref(true)
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
const suggestedCardArrow = computed(() => (language.value === 'fa' ? '←' : '→'))

const memberName = (memberId: string) => members.value.find((item) => item.id === memberId)?.username ?? memberId
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
  <div class="page-shell page-stack">
    <PageTopBar :title="`${strings.balancesPrefix} ${group?.name ?? ''}`" can-go-back @back="router.back()" />

    <div class="surface-card editor-card">
      <div class="switch-field">
        <div class="switch-field__content">
          <div class="page-topbar__title" style="font-size: 16px;">{{ strings.optimizePaymentsTitle }}</div>
          <div class="muted">{{ strings.optimizePaymentsSubtitle }}</div>
        </div>
        <label class="switch-button" :class="{ 'is-on': simplify }">
          <input v-model="simplify" class="switch-button__input" type="checkbox" />
        </label>
      </div>
    </div>

    <SectionHeader :title="strings.memberBalanceTitle" />
    <TransitionGroup name="feature-transition" tag="div" class="list-stack">
      <article v-for="balance in balanceResponse?.balances ?? []" :key="balance.member_id" class="surface-card editor-card balance-member-card">
        <div class="page-stack" style="gap: 14px;">
          <div class="balance-member-card__header">
            <div class="page-stack" style="gap: 4px;">
              <strong class="balance-member-card__name">{{ balance.member_name }}</strong>
              <span class="muted">{{ language === 'fa' ? 'وضعیت این عضو در گروه' : 'This member current balance state' }}</span>
            </div>
            <span
              class="balance-member-card__status"
              :class="{
                'is-creditor': balance.net_balance > 0,
                'is-debtor': balance.net_balance < 0,
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

          <div class="balance-member-card__metrics">
            <div class="balance-metric-tile">
              <div class="balance-metric-tile__label">{{ strings.paidStat }}</div>
              <AmountText :amount="balance.paid_total" :language="language" tone="primary" />
            </div>
            <div class="balance-metric-tile">
              <div class="balance-metric-tile__label">{{ strings.owedStat }}</div>
              <AmountText :amount="balance.owed_total" :language="language" tone="primary" />
            </div>
            <div class="balance-metric-tile balance-metric-tile--net">
              <div class="balance-metric-tile__label">{{ strings.netStat }}</div>
              <AmountText
                :amount="Math.abs(balance.net_balance)"
                :language="language"
                :tone="balance.net_balance > 0 ? 'success' : balance.net_balance < 0 ? 'danger' : 'default'"
              />
            </div>
          </div>
        </div>
      </article>
    </TransitionGroup>

    <template v-if="simplify">
      <SectionHeader :title="strings.suggestedPaymentsTitle" />
      <TransitionGroup name="feature-transition" tag="div" class="list-stack">
        <article
          v-for="transfer in balanceResponse?.simplified_debts ?? []"
          :key="`${transfer.from_member_id}-${transfer.to_member_id}`"
          class="suggestion-panel"
          style="cursor: pointer;"
          @click="goToSuggestedSettlement(transfer)"
        >
            <div class="detail-line detail-line--start suggested-payment-row">
              <div class="page-stack" style="gap: 8px;">
                <TransferFlow
                  class="suggested-payment-flow"
                  :from="memberName(transfer.from_member_id)"
                  :to="memberName(transfer.to_member_id)"
                />
                <AmountText :amount="transfer.amount" :language="language" tone="primary" size="lg" />
              </div>
              <div class="action-card__icon suggested-payment-icon" aria-hidden="true">{{ suggestedCardArrow }}</div>
          </div>
        </article>
        <EmptyStateCard
          v-if="(balanceResponse?.simplified_debts?.length ?? 0) === 0"
          :title="strings.allSettledTitle"
          :subtitle="strings.allSettledSubtitle"
        />
      </TransitionGroup>
    </template>
  </div>
</template>

<style scoped>
.balance-member-card {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-surface) 95%, white),
      color-mix(in srgb, var(--color-primary) 4%, var(--color-surface))
    );
}

.balance-member-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.balance-member-card__name {
  font-size: 18px;
  line-height: 28px;
}

.balance-member-card__status {
  flex: 0 0 auto;
  padding: 9px 14px;
  border-radius: 999px;
  font-weight: 700;
  line-height: 1;
}

.balance-member-card__status.is-creditor {
  background: color-mix(in srgb, var(--color-secondary) 16%, transparent);
  color: var(--color-secondary);
}

.balance-member-card__status.is-debtor {
  background: color-mix(in srgb, var(--color-tertiary) 16%, transparent);
  color: var(--color-tertiary);
}

.balance-member-card__status.is-settled {
  background: color-mix(in srgb, var(--color-outline) 16%, transparent);
  color: var(--color-on-surface-variant);
}

.balance-member-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.balance-metric-tile {
  padding: 14px 16px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--color-surface) 82%, white);
  border: 1px solid color-mix(in srgb, var(--color-outline) 10%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.balance-metric-tile--net {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
}

.balance-metric-tile__label {
  color: var(--color-on-surface-variant);
  font-size: 14px;
  line-height: 24px;
}

.suggested-payment-icon {
  direction: ltr;
  unicode-bidi: isolate;
}

.suggested-payment-icon {
  font-size: 22px;
}

@media (max-width: 640px) {
  .balance-member-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .balance-member-card__status {
    align-self: flex-start;
  }

  .balance-member-card__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .balance-metric-tile--net {
    grid-column: 1 / -1;
  }
}
</style>
