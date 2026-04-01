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
    <div class="modal-card">
      <div class="modal-card__header">
        <button class="icon-button modal-card__close" type="button" @click="emit('close')">✕</button>
        <strong class="modal-card__title">{{ title }}</strong>
        <div class="modal-card__spacer" aria-hidden="true"></div>
      </div>
      <div class="modal-card__body">
        <slot />
      </div>
    </div>
  </div>
</template>
