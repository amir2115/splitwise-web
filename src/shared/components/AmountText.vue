<script setup lang="ts">
import { computed } from 'vue'
import { formatAmountParts } from '@/shared/utils/format'
import type { AppLanguage } from '@/shared/api/types'

const props = withDefaults(defineProps<{
  amount: number
  language: AppLanguage
  tone?: 'default' | 'primary' | 'success' | 'danger'
  size?: 'md' | 'lg' | 'xl'
}>(), {
  tone: 'default',
  size: 'md',
})

const parts = computed(() => formatAmountParts(props.amount, props.language))
</script>

<template>
  <span class="amount-text" :class="[`amount-text--${tone}`, `amount-text--${size}`]">
    <span class="amount-text__value">{{ parts.value }}</span>
    <span class="amount-text__currency">{{ parts.currency }}</span>
  </span>
</template>

