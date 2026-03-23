<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <div class="surface-card empty-card">
    <div class="page-stack" style="gap: 8px;">
      <strong class="page-topbar__title" style="display: block; text-align: center;">{{ title }}</strong>
      <div class="muted">{{ subtitle }}</div>
    </div>
  </div>
</template>
