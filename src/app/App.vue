<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppSnackbar from '@/shared/components/AppSnackbar.vue'
import InstallPromptBanner from '@/shared/components/InstallPromptBanner.vue'
import { useInstallPromptStore } from '@/shared/stores/installPrompt'
import { useSettingsStore } from '@/shared/stores/settings'

const route = useRoute()
const settingsStore = useSettingsStore()
const installPromptStore = useInstallPromptStore()
const { strings } = storeToRefs(settingsStore)

const showBottomNav = computed(() => route.path === '/groups' || route.path === '/settings')

onMounted(() => {
  installPromptStore.initialize()
})
</script>

<template>
  <div class="app-shell">
    <AppSnackbar />
    <InstallPromptBanner />
    <main class="app-shell__content">
      <RouterView />
    </main>
    <nav v-if="showBottomNav" class="bottom-nav">
      <RouterLink class="nav-item" :class="{ 'is-active': route.path === '/groups' }" to="/groups">
        {{ strings.homeTab }}
      </RouterLink>
      <RouterLink class="nav-item" :class="{ 'is-active': route.path === '/settings' }" to="/settings">
        {{ strings.settingsTab }}
      </RouterLink>
    </nav>
  </div>
</template>
