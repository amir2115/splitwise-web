<script setup lang="ts">
import Icon, { ICON_NAMES } from '@/shared/components/Icon.vue'
import { computed } from 'vue'

const props = defineProps<{
  title: string
  subtitle: string
  icon?: string
}>()

const isKnownIcon = computed(() => typeof props.icon === 'string' && (ICON_NAMES as readonly string[]).includes(props.icon))
</script>

<template>
  <div class="surface-card empty-card">
    <div class="empty-card__inner">
      <div v-if="icon" class="empty-card__icon" aria-hidden="true">
        <Icon v-if="isKnownIcon" :name="(icon as any)" :size="20" />
        <span v-else-if="icon">{{ icon }}</span>
      </div>
      <strong class="empty-card__title">{{ title }}</strong>
      <span class="empty-card__subtitle">{{ subtitle }}</span>
    </div>
  </div>
</template>

<style scoped>
.empty-card {
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: center;
  padding: var(--s-7) var(--s-6);
}
.empty-card__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
}
.empty-card__icon {
  width: 44px;
  height: 44px;
  border-radius: var(--r-md);
  background: var(--brand-soft);
  color: var(--brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: var(--s-2);
}
.empty-card__title {
  font-size: var(--t-h2);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.01em;
  color: var(--fg);
}
.empty-card__subtitle {
  color: var(--fg-muted);
  font-size: var(--t-label);
  line-height: var(--lh-body);
}
</style>
