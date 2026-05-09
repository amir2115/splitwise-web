<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name?: string
  size?: number
  tone?: 'brand' | 'accent' | 'neg' | 'settled'
}>(), {
  name: '',
  size: 40,
  tone: 'brand',
})

const initial = computed(() => {
  const trimmed = (props.name ?? '').replace(/^@/, '').trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
})

const sizePx = computed(() => `${props.size}px`)
</script>

<template>
  <div
    class="avatar"
    :class="[`avatar--${tone}`]"
    :style="{ '--avatar-size': sizePx }"
    :title="name"
    aria-hidden="true"
  >
    {{ initial }}
  </div>
</template>
