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
    <div class="inline-alert__icon" aria-hidden="true">
      <svg v-if="tone === 'error'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6" />
        <circle cx="12" cy="16.5" r="0.7" fill="currentColor" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <circle cx="12" cy="7.5" r="0.8" fill="currentColor" />
      </svg>
    </div>
    <div class="inline-alert__content">
      <strong v-if="title">{{ title }}</strong>
      <span>{{ message }}</span>
    </div>
  </div>
</template>

<style scoped>
.inline-alert {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: var(--s-3);
  align-items: flex-start;
}
.inline-alert__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--r-pill);
  background: color-mix(in srgb, currentColor 14%, transparent);
}
.inline-alert--info {
  background: var(--brand-soft);
  color: var(--brand);
}
.inline-alert--info .inline-alert__content strong,
.inline-alert--info .inline-alert__content span {
  color: var(--brand);
}
</style>
