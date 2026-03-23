<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  message: string
  tone?: 'error' | 'info'
}>(), {
  title: '',
  tone: 'error',
})
</script>

<template>
  <div class="inline-alert" :class="[`inline-alert--${tone}`]" role="alert">
    <div class="inline-alert__icon">{{ tone === 'error' ? '!' : 'i' }}</div>
    <div class="inline-alert__content">
      <strong v-if="title">{{ title }}</strong>
      <span>{{ message }}</span>
    </div>
  </div>
</template>
