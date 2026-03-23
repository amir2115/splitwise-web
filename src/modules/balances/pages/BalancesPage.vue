<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import AmountText from '@/shared/components/AmountText.vue'
import { useBalancesStore } from '@/modules/balances/store'
import { useGroupsStore } from '@/modules/groups/store'
import { useMembersStore } from '@/modules/members/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string

const balancesStore = useBalancesStore()
const groupsStore = useGroupsStore()
const membersStore = useMembersStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()

const { strings, language } = storeToRefs(settingsStore)
const { byGroupId } = storeToRefs(balancesStore)
const { groups } = storeToRefs(groupsStore)
const { byGroupId: membersByGroupId } = storeToRefs(membersStore)

const simplify = ref(true)
const group = computed(() => groups.value.find((item) => item.id === groupId))
const balanceResponse = computed(() => byGroupId.value[groupId])
const members = computed(() => membersByGroupId.value[groupId] ?? [])

const memberName = (memberId: string) => members.value.find((item) => item.id === memberId)?.username ?? memberId
const directionArrow = computed(() => (language.value === 'fa' ? '←' : '→'))

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
    await Promise.all([balancesStore.load(groupId), membersStore.load(groupId)])
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
      <article v-for="balance in balanceResponse?.balances ?? []" :key="balance.member_id" class="surface-card editor-card">
        <div class="page-stack" style="gap: 12px;">
          <div class="detail-line">
            <strong>{{ balance.member_name }}</strong>
            <span
              :style="{
                color: balance.net_balance > 0 ? 'var(--color-primary)' : balance.net_balance < 0 ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)',
                fontWeight: 700,
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

          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-card__label">{{ strings.paidStat }}</div>
              <div class="metric-card__value">
                <AmountText :amount="balance.paid_total" :language="language" tone="primary" />
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-card__label">{{ strings.owedStat }}</div>
              <div class="metric-card__value">
                <AmountText :amount="balance.owed_total" :language="language" tone="primary" />
              </div>
            </div>
            <div class="metric-card metric-card--wide">
              <div class="metric-card__label">{{ strings.netStat }}</div>
              <div class="metric-card__value">
                <AmountText
                  :amount="Math.abs(balance.net_balance)"
                  :language="language"
                  :tone="balance.net_balance > 0 ? 'success' : balance.net_balance < 0 ? 'danger' : 'default'"
                />
              </div>
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
                <strong>{{ memberName(transfer.from_member_id) }} {{ directionArrow }} {{ memberName(transfer.to_member_id) }}</strong>
                <AmountText :amount="transfer.amount" :language="language" tone="primary" size="lg" />
              </div>
              <div class="action-card__icon">{{ directionArrow }}</div>
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
