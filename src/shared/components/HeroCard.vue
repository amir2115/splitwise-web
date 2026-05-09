<script setup lang="ts">
import Icon, { ICON_NAMES } from '@/shared/components/Icon.vue'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  icon?: string
  compact?: boolean
}>(), {
  subtitle: '',
  icon: '',
  compact: false,
})

const isKnownIcon = computed(() => typeof props.icon === 'string' && (ICON_NAMES as readonly string[]).includes(props.icon))
</script>

<template>
  <div class="surface-card hero-card" :class="{ 'hero-card--compact': compact }">
    <div v-if="icon" class="hero-card__icon">
      <Icon v-if="isKnownIcon" :name="(icon as any)" :size="22" />
      <span v-else-if="icon">{{ icon }}</span>
    </div>
    <h2 class="hero-card__title">{{ title }}</h2>
    <p v-if="subtitle" class="hero-card__subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.hero-card--compact {
  padding: var(--s-5) var(--s-6);
}
.hero-card--compact .hero-card__title {
  font-size: var(--t-title);
}
.hero-card--compact .hero-card__subtitle {
  font-size: var(--t-label);
}
</style>
