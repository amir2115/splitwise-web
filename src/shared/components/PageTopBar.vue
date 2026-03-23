<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/shared/stores/settings'

defineProps<{
  title: string
  canGoBack?: boolean
}>()

const emit = defineEmits<{
  back: []
}>()

const settingsStore = useSettingsStore()
const backIcon = computed(() => (settingsStore.direction === 'rtl' ? '→' : '←'))
</script>

<template>
  <header class="page-topbar page-topbar--sticky">
    <div class="page-topbar__leading">
      <button v-if="canGoBack" class="icon-button page-topbar__nav-button" type="button" @click="emit('back')">
        {{ backIcon }}
      </button>
    </div>
    <div class="page-topbar__title">{{ title }}</div>
    <div class="page-topbar__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
