<script setup lang="ts">
defineProps<{
  title: string
  dismissible?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="modal-backdrop" @click.self="dismissible !== false && emit('close')">
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-card__header">
        <button v-if="dismissible !== false" class="icon-button modal-card__close" type="button" @click="emit('close')">✕</button>
        <div v-else class="modal-card__spacer" aria-hidden="true"></div>
        <strong class="modal-card__title">{{ title }}</strong>
        <div class="modal-card__spacer" aria-hidden="true"></div>
      </div>
      <div class="modal-card__body">
        <slot />
      </div>
    </div>
  </div>
</template>
