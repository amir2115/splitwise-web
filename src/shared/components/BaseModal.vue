<script setup lang="ts">
defineProps<{
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card surface-card">
      <div class="page-stack" style="gap: 14px;">
        <div class="page-topbar" style="margin-bottom: 0;">
          <strong class="page-topbar__title">{{ title }}</strong>
          <button class="icon-button" type="button" @click="emit('close')">✕</button>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
