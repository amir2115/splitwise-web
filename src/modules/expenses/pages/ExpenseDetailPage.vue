<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import AmountText from '@/shared/components/AmountText.vue'
import Avatar from '@/shared/components/Avatar.vue'
import Icon from '@/shared/components/Icon.vue'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'
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

const splitMethodLabel = computed(() => {
  if (!expense.value) return ''
  if (expense.value.split_type === 'EQUAL') return strings.value.equalSplitLabel
  if (expense.value.split_type === 'SHARE') return strings.value.shareSplitLabel
  return strings.value.exactSplitLabel
})

const dateLabel = computed(() => expense.value ? formatDate(expense.value.created_at, language.value) : '')

const participantRows = computed(() => {
  if (!expense.value) return []
  const orderedIds = [
    ...new Set([
      ...expense.value.shares.map((share) => share.member_id),
      ...expense.value.payers.map((payer) => payer.member_id),
    ]),
  ]
  const rows = orderedIds.map((memberId) => {
    const paid = expense.value?.payers.find((payer) => payer.member_id === memberId)?.amount ?? 0
    const owed = expense.value?.shares.find((share) => share.member_id === memberId)?.amount ?? 0
    const net = paid - owed
    return {
      memberId,
      name: memberName(memberId),
      paid,
      owed,
      net,
      netAbsolute: Math.abs(net),
    }
  })
  return rows.sort((a, b) => b.net - a.net)
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
  <div class="page-shell page-stack expense-detail-page">
    <PageTopBar :title="expense?.title ?? strings.expenseDetailsFallback" can-go-back sticky @back="router.back()">
      <template #actions>
        <button
          v-if="expense"
          class="topbar-icon-button"
          type="button"
          :aria-label="strings.edit"
          @click="router.push(`/groups/${groupId}/expense/${expenseId}/edit`)"
        >
          <Icon name="edit" :size="14" />
        </button>
        <button
          v-if="expense"
          class="topbar-icon-button is-danger"
          type="button"
          :aria-label="strings.delete"
          @click="removeExpense"
        >
          <Icon name="trash" :size="14" />
        </button>
      </template>
    </PageTopBar>

    <template v-if="expense">
      <section class="expense-hero">
        <span class="expense-hero__pill">{{ strings.expenseSummaryPill }}</span>
        <div class="expense-hero__amount-row">
          <span class="expense-hero__amount num">{{ expense.total_amount.toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US') }}</span>
          <span class="expense-hero__currency">{{ language === 'fa' ? 'تومان' : 'T' }}</span>
        </div>
        <p v-if="expense.note" class="expense-hero__note">{{ expense.note }}</p>
        <div class="expense-hero__meta">
          <div class="expense-hero__meta-cell">
            <div class="expense-hero__meta-label">{{ strings.splitMethodStat }}</div>
            <div class="expense-hero__meta-value">{{ splitMethodLabel }}</div>
          </div>
          <div class="expense-hero__meta-cell">
            <div class="expense-hero__meta-label">{{ strings.dateStat }}</div>
            <div class="expense-hero__meta-value">{{ dateLabel }}</div>
          </div>
        </div>
      </section>

      <h3 class="eyebrow expense-detail-page__eyebrow">{{ strings.membersAndPayersTitle }}</h3>

      <section class="participant-card-list">
        <article
          v-for="row in participantRows"
          :key="row.memberId"
          class="participant-card"
        >
          <header class="participant-card__header">
            <Avatar :name="row.name" :size="36" :tone="row.net > 0 ? 'brand' : row.net < 0 ? 'accent' : 'settled'" />
            <div class="participant-card__meta">
              <strong class="participant-card__name"><UsernameHandle :username="row.name" /></strong>
              <span
                class="participant-card__role"
                :class="{
                  'is-credit': row.net > 0,
                  'is-debit': row.net < 0,
                  'is-settled': row.net === 0,
                }"
              >
                {{ row.net > 0 ? strings.expenseGetsBackLabel : (row.net < 0 ? strings.expenseOwesLabel : strings.settledLabel) }}
              </span>
            </div>
            <span
              v-if="row.net !== 0"
              class="participant-card__net num"
              :class="{ 'is-credit': row.net > 0, 'is-debit': row.net < 0 }"
            >
              <span class="participant-card__net-sign">{{ row.net > 0 ? '+' : '−' }}</span>
              <AmountText :amount="row.netAbsolute" :language="language" :tone="row.net > 0 ? 'success' : 'danger'" />
            </span>
          </header>
          <div class="participant-card__stats">
            <div class="participant-stat">
              <div class="participant-stat__label">{{ strings.expenseShareLabel }}</div>
              <AmountText :amount="row.owed" :language="language" />
            </div>
            <div class="participant-stat" :class="{ 'is-paid': row.paid > 0 }">
              <div class="participant-stat__label">{{ strings.expensePaidLabel }}</div>
              <AmountText :amount="row.paid" :language="language" :tone="row.paid > 0 ? 'primary' : 'default'" />
            </div>
          </div>
        </article>
      </section>
    </template>

    <div v-else class="surface-card empty-card">{{ strings.expenseNotFound }}</div>
  </div>
</template>

<style scoped>
.expense-detail-page { padding-top: 2px; }
.expense-detail-page__eyebrow { margin-top: var(--s-2); }

/* Top-bar icon buttons */
.topbar-icon-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--fg-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard), color var(--d-fast) var(--ease-standard);
}
.topbar-icon-button:hover { background: var(--hover); color: var(--fg); }
.topbar-icon-button.is-danger { color: var(--neg); }
.topbar-icon-button.is-danger:hover { color: var(--neg); background: var(--neg-soft); }

/* Hero summary card */
.expense-hero {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: 20px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.expense-hero__pill {
  display: inline-block;
  align-self: flex-start;
  font-size: 11px;
  font-weight: var(--fw-semibold);
  color: var(--brand);
  background: var(--brand-soft);
  padding: 4px 10px;
  border-radius: var(--r-pill);
}
.expense-hero__amount-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.expense-hero__amount {
  font-size: 44px;
  font-weight: var(--fw-bold);
  color: var(--fg);
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.expense-hero__currency {
  font-size: 16px;
  color: var(--fg-muted);
  font-weight: var(--fw-medium);
}
.expense-hero__note {
  margin: 0;
  font-size: 13px;
  color: var(--fg-muted);
  line-height: 1.5;
  white-space: pre-wrap;
}
.expense-hero__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.expense-hero__meta-label {
  font-size: 11px;
  color: var(--fg-subtle);
  margin-bottom: 4px;
}
.expense-hero__meta-value {
  font-size: 14px;
  font-weight: var(--fw-semibold);
}

/* Participant cards */
.participant-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.participant-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.participant-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.participant-card__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.participant-card__name {
  font-size: 14px;
  font-weight: var(--fw-semibold);
}
.participant-card__role {
  font-size: 12px;
  font-weight: var(--fw-medium);
}
.participant-card__role.is-credit { color: var(--pos); }
.participant-card__role.is-debit { color: var(--neg); }
.participant-card__role.is-settled { color: var(--fg-subtle); }
.participant-card__net {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  font-weight: var(--fw-bold);
  padding: 5px 10px;
  border-radius: var(--r-pill);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.participant-card__net.is-credit { background: var(--pos-soft); color: var(--pos); }
.participant-card__net.is-debit { background: var(--neg-soft); color: var(--neg); }
.participant-card__net-sign { font-weight: var(--fw-bold); }

.participant-card__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.participant-stat {
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--surface-sunk);
  border: 1px solid var(--divider);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.participant-stat.is-paid {
  background: var(--brand-soft);
  border-color: transparent;
}
.participant-stat__label {
  font-size: 10px;
  font-weight: var(--fw-semibold);
  color: var(--fg-subtle);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.participant-stat.is-paid .participant-stat__label { color: var(--brand); }
.participant-stat.is-paid :deep(.amount-text) { color: var(--brand); }
</style>
