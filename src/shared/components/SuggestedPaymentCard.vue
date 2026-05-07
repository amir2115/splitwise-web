<script setup lang="ts">
import AmountText from '@/shared/components/AmountText.vue'
import { computed } from 'vue'
import type { AppLanguage } from '@/shared/api/types'

const props = withDefaults(
  defineProps<{
    from: string
    to: string
    amount: number
    language: AppLanguage
    icon?: string
    tone?: 'default' | 'success' | 'danger'
  }>(),
  {
    icon: '',
    tone: 'default',
  },
)

const toneClass = computed(() => ({
  'suggestion-panel--success': props.tone === 'success',
  'suggestion-panel--danger': props.tone === 'danger',
}))
</script>

<template>
  <article class="suggestion-panel" :class="toneClass">
    <div class="suggested-payment-row">
      <div v-if="icon" class="action-card__icon suggested-payment-icon" aria-hidden="true">{{ icon }}</div>
      <div class="suggested-payment-content">
        <div class="suggested-payment-flow">
          <strong class="suggested-payment-flow__party">{{ from }}</strong>
          <span class="suggested-payment-flow__arrow" aria-hidden="true">→</span>
          <strong class="suggested-payment-flow__party">{{ to }}</strong>
        </div>
        <div class="suggested-payment-amount">
          <AmountText :amount="amount" :language="language" tone="primary" size="lg" />
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.suggested-payment-icon {
  direction: ltr;
  unicode-bidi: isolate;
  flex: 0 0 auto;
  font-size: 22px;
}

.suggested-payment-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  direction: ltr;
}

.suggested-payment-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  text-align: right;
}

.suggested-payment-flow {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  direction: ltr;
  unicode-bidi: isolate;
}

.suggested-payment-flow__party,
.suggested-payment-flow__arrow {
  direction: ltr;
  unicode-bidi: isolate;
}

.suggested-payment-flow__party {
  font-size: 16px;
  line-height: 25px;
  font-weight: 700;
  min-width: 0;
  max-width: calc(50% - 18px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggested-payment-flow__arrow {
  color: var(--color-primary);
  font-size: 20px;
  line-height: 1;
  flex: 0 0 auto;
}

.suggested-payment-amount {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
  direction: ltr;
}

.suggested-payment-amount :deep(.amount-text) {
  flex-wrap: nowrap;
  justify-content: flex-end;
  text-align: end;
  direction: ltr;
  unicode-bidi: isolate;
}

.suggestion-panel--success {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-status-creditor-bg) 92%, var(--color-surface-strong)),
    color-mix(in srgb, var(--color-status-creditor-bg) 76%, var(--color-surface))
  );
  border-color: color-mix(in srgb, var(--color-status-creditor) 28%, var(--color-border-strong));
}

.suggestion-panel--danger {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-status-debtor-bg) 92%, var(--color-surface-strong)),
    color-mix(in srgb, var(--color-status-debtor-bg) 76%, var(--color-surface))
  );
  border-color: color-mix(in srgb, var(--color-status-debtor) 28%, var(--color-border-strong));
}

@media (max-width: 640px) {
  .suggested-payment-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .suggested-payment-icon {
    display: none;
  }
}
</style>
