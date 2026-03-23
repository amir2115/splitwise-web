<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <h3 class="section-title">{{ title }}</h3>
</template>
