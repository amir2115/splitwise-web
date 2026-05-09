<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '@/shared/components/Avatar.vue'
import { useSettingsStore } from '@/shared/stores/settings'
import { storeToRefs } from 'pinia'
import type { Member } from '@/shared/api/types'
import type { PersonalSimplifiedDebtSummary, PersonalSimplifiedDebtItem } from '@/modules/balances/personalSummary'
import { formatAmount } from '@/shared/utils/format'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'
import Icon from '@/shared/components/Icon.vue'

const props = defineProps<{
  summary: PersonalSimplifiedDebtSummary
  members: Member[]
  isLoading?: boolean
  payLabel: string
  settledTitle: string
  settledSubtitle?: string
  receiveLabel: string
  payVerbLabel: string
}>()

const emit = defineEmits<{
  pay: [item: PersonalSimplifiedDebtItem]
}>()

const settingsStore = useSettingsStore()
const { language } = storeToRefs(settingsStore)
const isRtl = computed(() => language.value === 'fa')

interface Row {
  kind: 'pay' | 'receive'
  item: PersonalSimplifiedDebtItem
}

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const item of props.summary.payables) out.push({ kind: 'pay', item })
  for (const item of props.summary.receivables) out.push({ kind: 'receive', item })
  return out
})

const isSettled = computed(() => !props.isLoading && rows.value.length === 0)

function memberName(memberId: string) {
  return props.members.find((m) => m.id === memberId)?.username ?? memberId
}
</script>

<template>
  <div class="balances-summary">
    <div v-if="isLoading" class="balances-summary__skeleton">
      <div v-for="i in 2" :key="`bal-skel-${i}`" class="balances-summary__row balances-summary__row--skel">
        <div class="balances-summary__avatar-skel" />
        <div class="balances-summary__avatar-skel" />
        <div class="balances-summary__body-skel" />
        <div class="balances-summary__amount-skel" />
      </div>
    </div>

    <div v-else-if="isSettled" class="balances-summary__settled">
      <div class="balances-summary__settled-icon" aria-hidden="true">
        <Icon name="check" :size="22" />
      </div>
      <strong>{{ settledTitle }}</strong>
      <span v-if="settledSubtitle">{{ settledSubtitle }}</span>
    </div>

    <div v-else class="balances-summary__list">
      <div
        v-for="(row, index) in rows"
        :key="`${row.item.from_member_id}-${row.item.to_member_id}-${index}`"
        class="balances-summary__row"
      >
        <Avatar :name="memberName(row.item.from_member_id)" :size="36" :tone="row.kind === 'pay' ? 'accent' : 'brand'" />
        <span class="balances-summary__arrow" aria-hidden="true">
          <Icon :name="isRtl ? 'arrow-left' : 'arrow-right'" :size="16" />
        </span>
        <Avatar :name="memberName(row.item.to_member_id)" :size="36" :tone="row.kind === 'receive' ? 'brand' : 'accent'" />
        <div class="balances-summary__meta">
          <strong><UsernameHandle :username="memberName(row.item.from_member_id)" /></strong>
          <span><UsernameHandle :username="memberName(row.item.to_member_id)" /></span>
        </div>
        <span
          class="balances-summary__amount num"
          :class="{ 'is-pos': row.kind === 'receive', 'is-neg': row.kind === 'pay' }"
        >{{ formatAmount(row.item.amount, language) }}</span>
        <button class="balances-summary__pay" type="button" @click="emit('pay', row.item)">
          {{ row.kind === 'pay' ? payVerbLabel : receiveLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.balances-summary {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: var(--shadow-1);
}

.balances-summary__list {
  display: flex;
  flex-direction: column;
}

.balances-summary__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--divider);
}
.balances-summary__row:last-child { border-bottom: 0; }

.balances-summary__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-subtle);
  flex-shrink: 0;
}
.balances-summary__arrow svg { width: 16px; height: 16px; }

.balances-summary__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.balances-summary__meta strong {
  font-size: 13px;
  font-weight: var(--fw-medium);
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.balances-summary__meta span {
  font-size: 11px;
  color: var(--fg-subtle);
}

.balances-summary__amount {
  font-size: 15px;
  font-weight: var(--fw-semibold);
  letter-spacing: -0.01em;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.balances-summary__amount.is-pos { color: var(--pos); }
.balances-summary__amount.is-neg { color: var(--neg); }

.balances-summary__pay {
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: var(--fw-semibold);
  background: var(--brand-soft);
  color: var(--brand);
  border: 0;
  border-radius: var(--r-pill);
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard), transform var(--d-instant) var(--ease-standard);
}
.balances-summary__pay:hover { background: color-mix(in srgb, var(--brand) 18%, transparent); }
.balances-summary__pay:active { transform: scale(0.96); }

/* Settled state */
.balances-summary__settled {
  padding: 28px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.balances-summary__settled-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--pos-soft);
  color: var(--pos);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.balances-summary__settled-icon svg { width: 22px; height: 22px; }
.balances-summary__settled strong {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
  color: var(--fg);
}
.balances-summary__settled span {
  font-size: var(--t-caption);
  color: var(--fg-muted);
}

/* Skeleton */
.balances-summary__skeleton .balances-summary__row--skel {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--divider);
}
.balances-summary__skeleton .balances-summary__row--skel:last-child { border-bottom: 0; }
.balances-summary__avatar-skel,
.balances-summary__body-skel,
.balances-summary__amount-skel {
  background: linear-gradient(90deg, var(--surface-sunk), var(--surface-2), var(--surface-sunk));
  background-size: 200% 100%;
  animation: bal-shimmer 1.4s linear infinite;
}
.balances-summary__avatar-skel { width: 36px; height: 36px; border-radius: 50%; }
.balances-summary__body-skel { flex: 1; height: 12px; border-radius: var(--r-pill); }
.balances-summary__amount-skel { width: 60px; height: 12px; border-radius: var(--r-pill); }
@keyframes bal-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (max-width: 480px) {
  .balances-summary__row { padding: 12px 12px; gap: 8px; }
  .balances-summary__pay { padding: 5px 10px; font-size: 10px; }
}
</style>
