<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
  icon?: string
}>()
</script>

<template>
  <div class="surface-card hero-card">
    <div class="hero-card__icon">{{ icon ?? '◉' }}</div>
    <h2 class="hero-card__title">{{ title }}</h2>
    <p class="hero-card__subtitle">{{ subtitle }}</p>
  </div>
</template>
