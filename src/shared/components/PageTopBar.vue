<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/shared/components/Icon.vue'
import { useSettingsStore } from '@/shared/stores/settings'

withDefaults(defineProps<{
  title: string
  canGoBack?: boolean
  /** Stick the topbar to the top of the page (with backdrop blur). Default: false. */
  sticky?: boolean
}>(), {
  canGoBack: false,
  sticky: false,
})

const emit = defineEmits<{
  back: []
}>()

const settingsStore = useSettingsStore()
const isRtl = computed(() => settingsStore.direction === 'rtl')
</script>

<template>
  <header class="page-topbar" :class="{ 'page-topbar--sticky': sticky, 'page-topbar--no-leading': !canGoBack }">
    <div v-if="canGoBack" class="page-topbar__leading">
      <button
        class="icon-button page-topbar__nav-button"
        type="button"
        :aria-label="'Back'"
        @click="emit('back')"
      >
        <Icon :name="isRtl ? 'arrow-right' : 'arrow-left'" :size="18" aria-hidden="true" />
      </button>
    </div>
    <div class="page-topbar__title">{{ title }}</div>
    <div class="page-topbar__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
