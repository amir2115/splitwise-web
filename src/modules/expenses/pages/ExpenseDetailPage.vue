<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import AmountText from '@/shared/components/AmountText.vue'
import { useMembersStore } from '@/modules/members/store'
import { useExpensesStore } from '@/modules/expenses/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { formatDate } from '@/shared/utils/format'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string
const expenseId = route.params.expenseId as string

const membersStore = useMembersStore()
const expensesStore = useExpensesStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()

const { strings, language } = storeToRefs(settingsStore)
const { byGroupId: membersByGroupId } = storeToRefs(membersStore)
const { byGroupId: expensesByGroupId } = storeToRefs(expensesStore)

const members = computed(() => membersByGroupId.value[groupId] ?? [])
const expense = computed(() => (expensesByGroupId.value[groupId] ?? []).find((item) => item.id === expenseId))

const memberName = (memberId: string) => members.value.find((item) => item.id === memberId)?.username ?? `${strings.value.membersLabel} ${memberId}`

const overviewItems = computed(() => {
  if (!expense.value) return []
  return [
    { label: strings.value.splitMethodStat, value: expense.value.split_type === 'EQUAL' ? strings.value.equalSplitLabel : strings.value.exactSplitLabel },
    { label: strings.value.dateStat, value: formatDate(expense.value.created_at, language.value) },
  ]
})

const participantRows = computed(() => {
  if (!expense.value) return []
  const orderedIds = [
    ...new Set([
      ...expense.value.shares.map((share) => share.member_id),
      ...expense.value.payers.map((payer) => payer.member_id),
    ]),
  ]

  return orderedIds.map((memberId) => {
    const paid = expense.value?.payers.find((payer) => payer.member_id === memberId)?.amount ?? 0
    const owed = expense.value?.shares.find((share) => share.member_id === memberId)?.amount ?? 0
    const net = paid - owed
    return {
      memberId,
      name: memberName(memberId),
      initial: memberName(memberId).trim().slice(0, 1).toUpperCase(),
      paid,
      owed,
      net,
      netAbsolute: Math.abs(net),
    }
  })
})

onMounted(async () => {
  try {
    await Promise.all([membersStore.load(groupId), expensesStore.load(groupId)])
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
})

async function removeExpense() {
  if (!expense.value || !window.confirm(strings.value.confirmDelete)) return
  try {
    await expensesStore.remove(expense.value)
    router.back()
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}
</script>

<template>
  <div class="page-shell page-stack">
    <PageTopBar :title="expense?.title ?? strings.expenseDetailsFallback" can-go-back @back="router.back()">
      <template #actions>
        <button v-if="expense" class="icon-button" type="button" @click="router.push(`/groups/${groupId}/expense/${expenseId}/edit`)">✎</button>
        <button v-if="expense" class="icon-button" type="button" @click="removeExpense">🗑</button>
      </template>
    </PageTopBar>

    <template v-if="expense">
      <HeroCard :title="expense.title" :subtitle="expense.note || strings.noDescription" icon="◧" />

      <section class="surface-card expense-overview-card page-stack">
        <div class="page-stack" style="gap: 8px;">
          <span class="expense-overview-card__eyebrow">{{ language === 'fa' ? 'خلاصه خرج' : 'Expense overview' }}</span>
          <AmountText :amount="expense.total_amount" :language="language" size="xl" tone="primary" />
        </div>

        <div class="expense-overview-meta">
          <div v-for="item in overviewItems" :key="item.label" class="expense-overview-meta__row">
            <span class="expense-overview-meta__label">{{ item.label }}</span>
            <strong class="expense-overview-meta__value">{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <section v-if="participantRows.length > 0" class="surface-card expense-participants-card page-stack">
        <SectionHeader :title="strings.membersAndPayersTitle" />
        <div class="page-stack expense-participants-card__list">
          <article v-for="row in participantRows" :key="row.memberId" class="participant-row-card">
            <div class="participant-row-card__header">
              <div class="participant-row-card__badge">{{ row.initial }}</div>
              <div class="page-stack participant-row-card__meta" style="gap: 4px;">
                <strong>{{ row.name }}</strong>
                <span
                  class="participant-row-card__state"
                  :class="{
                    'is-creditor': row.net > 0,
                    'is-debtor': row.net < 0,
                    'is-settled': row.net === 0,
                  }"
                >
                  {{
                    row.net > 0
                      ? strings.creditorLabel
                      : row.net < 0
                        ? strings.debtorLabel
                        : strings.settledLabel
                  }}
                </span>
              </div>
              <span class="chip participant-row-card__net">
                <AmountText
                  :amount="row.netAbsolute"
                  :language="language"
                  size="md"
                  :tone="row.net > 0 ? 'success' : row.net < 0 ? 'danger' : 'default'"
                />
              </span>
            </div>

            <div class="participant-row-card__stats">
              <div class="participant-stat-tile participant-stat-tile--paid">
                <span class="muted">{{ strings.paidStat }}</span>
                <AmountText :amount="row.paid" :language="language" size="md" tone="primary" />
              </div>
              <div class="participant-stat-tile participant-stat-tile--owed">
                <span class="muted">{{ strings.owedStat }}</span>
                <AmountText :amount="row.owed" :language="language" size="md" tone="primary" />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="surface-card expense-breakdown-card page-stack">
        <SectionHeader :title="strings.payersTitle" />
        <div class="page-stack expense-breakdown-card__list">
          <div v-for="payer in expense.payers" :key="payer.member_id" class="expense-breakdown-row">
            <div class="expense-breakdown-row__dot expense-breakdown-row__dot--primary"></div>
            <span class="expense-breakdown-row__name">{{ memberName(payer.member_id) }}</span>
            <AmountText :amount="payer.amount" :language="language" size="md" tone="primary" />
          </div>
        </div>
      </section>

      <section class="surface-card expense-breakdown-card page-stack">
        <SectionHeader :title="strings.sharesTitle" />
        <div class="page-stack expense-breakdown-card__list">
          <div v-for="share in expense.shares" :key="share.member_id" class="expense-breakdown-row">
            <div class="expense-breakdown-row__dot expense-breakdown-row__dot--tertiary"></div>
            <span class="expense-breakdown-row__name">{{ memberName(share.member_id) }}</span>
            <AmountText :amount="share.amount" :language="language" size="md" tone="danger" />
          </div>
        </div>
      </section>
    </template>

    <div v-else class="surface-card empty-card">{{ strings.expenseNotFound }}</div>
  </div>
</template>

<style scoped>
.expense-overview-card,
.expense-participants-card,
.expense-breakdown-card {
  padding: 20px;
}

.expense-overview-card {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-primary) 9%, var(--color-surface)),
      color-mix(in srgb, var(--color-surface) 94%, transparent)
    );
}

.expense-overview-card__eyebrow {
  color: var(--color-primary);
  font-size: 13px;
  line-height: 20px;
  font-weight: 700;
}

.participant-row-card__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.participant-stat-tile {
  padding: 14px 16px;
  border-radius: 22px;
  background: color-mix(in srgb, var(--color-surface) 84%, white);
  border: 1px solid color-mix(in srgb, var(--color-outline) 10%, transparent);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 110px;
}

.expense-overview-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.expense-overview-meta__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--color-outline) 10%, transparent);
}

.expense-overview-meta__row:first-child {
  padding-top: 0;
  border-top: 0;
}

.expense-overview-meta__label {
  color: var(--color-on-surface-variant);
  font-size: 15px;
  line-height: 24px;
}

.expense-overview-meta__value {
  font-size: 18px;
  line-height: 28px;
  font-weight: 700;
}

.expense-participants-card__list,
.expense-breakdown-card__list {
  gap: 14px;
}

.participant-row-card {
  padding: 14px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--color-outline) 10%, transparent);
}

.participant-row-card:first-child {
  padding-top: 0;
  border-top: 0;
}

.participant-row-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.participant-row-card__badge {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.participant-row-card__meta {
  flex: 1;
  min-width: 0;
}

.participant-row-card__state {
  font-weight: 700;
}

.participant-row-card__state.is-creditor {
  color: var(--color-status-creditor);
}

.participant-row-card__state.is-debtor {
  color: var(--color-status-debtor);
}

.participant-row-card__state.is-settled {
  color: var(--color-status-settled);
}

.participant-row-card__net {
  pointer-events: none;
  min-height: 34px;
  padding-inline: 12px;
}

.participant-stat-tile {
  padding: 14px 12px 12px;
  min-height: 96px;
  gap: 12px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  text-align: center;
  background: var(--color-surface-soft);
  border-color: var(--color-border-soft);
}

.participant-stat-tile .muted {
  display: block;
  width: 100%;
  font-size: 13px;
  line-height: 20px;
  font-weight: 700;
  text-align: center;
}

.participant-stat-tile :deep(.amount-text) {
  font-size: 18px;
  line-height: 28px;
  white-space: nowrap;
  justify-content: center;
  text-align: center;
}

.participant-stat-tile--paid {
  background: var(--color-surface-soft);
}

.participant-stat-tile--owed {
  background: var(--color-surface-accent);
}

.expense-breakdown-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.expense-breakdown-row + .expense-breakdown-row {
  border-top: 1px solid color-mix(in srgb, var(--color-outline) 10%, transparent);
}

.expense-breakdown-row__dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.expense-breakdown-row__dot--primary {
  background: var(--color-primary);
}

.expense-breakdown-row__dot--tertiary {
  background: var(--color-status-debtor);
}

.expense-breakdown-row__name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}

@media (max-width: 640px) {
  .expense-overview-card,
  .expense-participants-card,
  .expense-breakdown-card {
    padding: 16px;
  }

  .participant-row-card__header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .participant-row-card__net {
    margin-inline-start: 54px;
  }

  .participant-row-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .participant-stat-tile {
    min-height: 88px;
    padding: 12px 10px 10px;
    gap: 10px;
  }

  .expense-overview-meta__row {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}

@media (max-width: 380px) {
  .participant-row-card__stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .participant-stat-tile {
    min-height: 82px;
  }
}
</style>
