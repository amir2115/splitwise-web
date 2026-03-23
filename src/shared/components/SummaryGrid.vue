<script setup lang="ts">
import AmountText from '@/shared/components/AmountText.vue'
import type { AppLanguage } from '@/shared/api/types'

defineProps<{
  items: Array<{ label: string; value?: string; amount?: number }>
  language?: AppLanguage
}>()
</script>

<template>
  <div class="summary-grid">
    <article v-for="item in items" :key="item.label" class="summary-tile">
      <div class="summary-tile__label">{{ item.label }}</div>
      <div class="summary-tile__value">
        <AmountText v-if="item.amount !== undefined && language" :amount="item.amount" :language="language" tone="primary" />
        <template v-else>{{ item.value }}</template>
      </div>
    </article>
  </div>
</template>
