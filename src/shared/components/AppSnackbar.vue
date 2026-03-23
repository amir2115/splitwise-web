<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSnackbarStore } from '@/shared/stores/snackbar'

const snackbarStore = useSnackbarStore()
const { items } = storeToRefs(snackbarStore)
</script>

<template>
  <div class="snackbar-stack">
    <TransitionGroup name="feature-transition" tag="div" class="page-stack" style="gap: 10px;">
      <div v-for="item in items" :key="item.id" class="snackbar" :class="{ 'is-error': item.tone === 'error' }">
        {{ item.message }}
      </div>
    </TransitionGroup>
  </div>
</template>
