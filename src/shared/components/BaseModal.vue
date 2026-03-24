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
        <div class="page-topbar modal-topbar" style="margin-bottom: 0;">
          <div class="page-topbar__leading"></div>
          <strong class="page-topbar__title modal-topbar__title">{{ title }}</strong>
          <div class="page-topbar__actions">
            <button class="icon-button" type="button" @click="emit('close')">✕</button>
          </div>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
