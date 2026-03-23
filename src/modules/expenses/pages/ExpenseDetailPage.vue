<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import SummaryGrid from '@/shared/components/SummaryGrid.vue'
import { useMembersStore } from '@/modules/members/store'
import { useExpensesStore } from '@/modules/expenses/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { formatAmount, formatCompactCount, formatDate } from '@/shared/utils/format'

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

const summaryItems = computed(() => {
  if (!expense.value) return []
  return [
    { label: strings.value.totalAmountStat, value: formatAmount(expense.value.total_amount, language.value) },
    { label: strings.value.splitMethodStat, value: expense.value.split_type === 'EQUAL' ? strings.value.equalSplitLabel : strings.value.exactSplitLabel },
    { label: strings.value.dateStat, value: formatDate(expense.value.created_at, language.value) },
    { label: strings.value.peopleCountStat, value: formatCompactCount(expense.value.shares.length, language.value) },
  ]
})

const memberName = (memberId: string) => members.value.find((item) => item.id === memberId)?.username ?? `${strings.value.membersLabel} ${memberId}`

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
      <SummaryGrid :items="summaryItems" />

      <SectionHeader :title="strings.payersTitle" />
      <div class="surface-card" style="padding: 18px;">
        <div class="page-stack" style="gap: 10px;">
          <div v-for="payer in expense.payers" :key="payer.member_id" class="detail-line">
            <span>{{ memberName(payer.member_id) }}</span>
            <span class="detail-line__value">{{ formatAmount(payer.amount, language) }}</span>
          </div>
        </div>
      </div>

      <SectionHeader :title="strings.sharesTitle" />
      <div class="surface-card" style="padding: 18px;">
        <div class="page-stack" style="gap: 10px;">
          <div v-for="share in expense.shares" :key="share.member_id" class="detail-line">
            <span>{{ memberName(share.member_id) }}</span>
            <span class="detail-line__value">{{ formatAmount(share.amount, language) }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="surface-card empty-card">{{ strings.expenseNotFound }}</div>
  </div>
</template>
