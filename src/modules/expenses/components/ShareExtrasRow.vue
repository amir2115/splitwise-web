<script setup lang="ts">
/**
 * Per-member breakdown badge for the expense share list.
 *
 * Sits below the value/field column of a `.share-row` and surfaces non-base
 * components (service, tax, discount) without cluttering the row itself.
 *
 * Tap toggles a small breakdown line that shows the full math:
 *
 *   پایه + سرویس + مالیات − تخفیف = نهایی
 *
 * The component never renders if there's nothing extra to communicate — the
 * parent decides via `hasMemberExtras` whether to mount it at all.
 */
import { computed } from 'vue'
import { formatAmount } from '@/shared/utils/format'
import type { ExpenseEditorMemberDraft } from '@/modules/expenses/expenseEditor'

interface EnrichedMember extends ExpenseEditorMemberDraft {
  baseSharePreview: number
  taxSharePreview: number
  serviceChargeSharePreview: number
  discountSharePreview: number
  finalSharePreview: number
}

interface ExtrasText {
  serviceShareBadge: (amount: string) => string
  serviceBreakdownLabel: string
  serviceBreakdownBase: string
  serviceBreakdownTax: string
  serviceBreakdownDiscount: string
  serviceBreakdownService: string
  serviceBreakdownFinal: string
}

const props = defineProps<{
  member: EnrichedMember
  expanded: boolean
  text: ExtrasText
  language: 'fa' | 'en'
  currencyLabel: string
}>()

defineEmits<{ toggle: [] }>()

const hasService = computed(() => props.member.serviceChargeSharePreview > 0)
const hasTax = computed(() => props.member.taxSharePreview > 0)
const hasDiscount = computed(() => props.member.discountSharePreview > 0)

// The badge prefers the most actionable label. Service is the user-visible "extra"
// that motivated the per-row indicator in the first place; tax/discount are
// already shown in the totals card so we don't re-promote them in the badge label.
const badgeLabel = computed(() => {
  if (hasService.value) {
    return props.text.serviceShareBadge(formatAmount(props.member.serviceChargeSharePreview, props.language))
  }
  if (hasTax.value) {
    return `+ ${formatAmount(props.member.taxSharePreview, props.language)} ${props.text.serviceBreakdownTax}`
  }
  if (hasDiscount.value) {
    return `− ${formatAmount(props.member.discountSharePreview, props.language)} ${props.text.serviceBreakdownDiscount}`
  }
  return ''
})
</script>

<template>
  <div class="share-extras">
    <button
      class="share-extras__badge"
      type="button"
      :aria-expanded="expanded"
      :aria-label="text.serviceBreakdownLabel"
      @click="$emit('toggle')"
    >
      <span class="share-extras__badge-label">{{ badgeLabel }}</span>
      <svg
        class="share-extras__chevron"
        :class="{ 'is-open': expanded }"
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
    <Transition name="extras-expand">
      <dl v-if="expanded" class="share-extras__breakdown" :aria-label="text.serviceBreakdownLabel">
        <div class="share-extras__row">
          <dt>{{ text.serviceBreakdownBase }}</dt>
          <dd class="num">{{ formatAmount(member.baseSharePreview, language) }}</dd>
        </div>
        <div v-if="hasService" class="share-extras__row">
          <dt>{{ text.serviceBreakdownService }}</dt>
          <dd class="num share-extras__row-add">+ {{ formatAmount(member.serviceChargeSharePreview, language) }}</dd>
        </div>
        <div v-if="hasTax" class="share-extras__row">
          <dt>{{ text.serviceBreakdownTax }}</dt>
          <dd class="num share-extras__row-add">+ {{ formatAmount(member.taxSharePreview, language) }}</dd>
        </div>
        <div v-if="hasDiscount" class="share-extras__row">
          <dt>{{ text.serviceBreakdownDiscount }}</dt>
          <dd class="num share-extras__row-sub">− {{ formatAmount(member.discountSharePreview, language) }}</dd>
        </div>
        <div class="share-extras__row share-extras__row--total">
          <dt>{{ text.serviceBreakdownFinal }}</dt>
          <dd class="num">{{ formatAmount(member.finalSharePreview, language) }} <span class="muted">{{ currencyLabel }}</span></dd>
        </div>
      </dl>
    </Transition>
  </div>
</template>

<style scoped>
.share-extras {
  /* Spans both content columns under the avatar + value/field, keeping the
     badge visually attached to its row. The parent grid puts us on row 2. */
  grid-column: 3 / 5;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--s-1);
  padding-block-start: 2px;
  min-width: 0;
}

.share-extras__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px var(--s-2);
  background: color-mix(in srgb, var(--brand) 12%, transparent);
  color: var(--brand);
  border: 0;
  border-radius: 999px;
  font-size: 11px;
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard);
  max-width: 100%;
}
.share-extras__badge:hover {
  background: color-mix(in srgb, var(--brand) 20%, transparent);
}

.share-extras__badge-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.share-extras__chevron {
  flex-shrink: 0;
  transition: transform var(--d-fast) var(--ease-standard);
}
.share-extras__chevron.is-open { transform: rotate(180deg); }

.share-extras__breakdown {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: var(--s-2) 0 0;
  padding: var(--s-3) var(--s-3);
  background: var(--surface-sunk);
  border-radius: var(--r-sm);
  font-size: var(--t-caption);
}
.share-extras__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
  color: var(--fg-muted);
}
.share-extras__row dt { color: var(--fg-muted); }
.share-extras__row dd { color: var(--fg); font-weight: var(--fw-medium); margin: 0; }
.share-extras__row-add { color: var(--brand); }
.share-extras__row-sub { color: var(--neg); }
.share-extras__row--total {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--divider);
  color: var(--fg);
  font-weight: var(--fw-semibold);
}
.share-extras__row--total dt { color: var(--fg); font-weight: var(--fw-semibold); }
.share-extras__row--total dd { color: var(--brand); font-weight: var(--fw-semibold); }
.share-extras__row--total .muted {
  color: var(--fg-muted);
  font-weight: var(--fw-regular);
  font-size: 11px;
  margin-inline-start: 2px;
}

/* ----- Expand/collapse animation ----- */
.extras-expand-enter-active,
.extras-expand-leave-active {
  transition:
    opacity var(--d-base) var(--ease-standard),
    transform var(--d-base) var(--ease-standard),
    max-height var(--d-base) var(--ease-standard);
  overflow: hidden;
  max-height: 240px;
}
.extras-expand-enter-from,
.extras-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}
</style>
