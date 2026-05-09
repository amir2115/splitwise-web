<script setup lang="ts">
import AmountText from '@/shared/components/AmountText.vue'
import Avatar from '@/shared/components/Avatar.vue'
import Icon from '@/shared/components/Icon.vue'
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

void props.tone
</script>

<template>
  <article class="suggested-card">
    <div class="suggested-card__avatars">
      <Avatar :name="from" tone="accent" :size="36" />
      <span class="suggested-card__arrow suggested-arrow" aria-hidden="true">
        <Icon name="arrow-right" :size="16" />
      </span>
      <Avatar :name="to" tone="brand" :size="36" />
    </div>
    <div class="suggested-card__meta">
      <strong class="suggested-card__from">{{ from }}</strong>
      <span class="suggested-card__sub">{{ to }}</span>
    </div>
    <div class="suggested-card__amount">
      <AmountText :amount="amount" :language="language" tone="primary" size="md" />
    </div>
  </article>
</template>

<style scoped>
.suggested-card {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-5);
}
.suggested-card__avatars {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}
.suggested-card__arrow {
  color: var(--fg-subtle);
  display: inline-flex;
}
.suggested-card__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.suggested-card__from {
  font-size: var(--t-label);
  font-weight: var(--fw-medium);
  color: var(--fg);
}
.suggested-card__sub {
  font-size: 11px;
  color: var(--fg-subtle);
}
.suggested-card__amount {
  display: inline-flex;
}
</style>
