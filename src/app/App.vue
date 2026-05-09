<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppSnackbar from '@/shared/components/AppSnackbar.vue'
import InstallPromptBanner from '@/shared/components/InstallPromptBanner.vue'
import Icon from '@/shared/components/Icon.vue'
import { useInstallPromptStore } from '@/shared/stores/installPrompt'
import { useAppShellStore } from '@/shared/stores/appShell'
import { useSettingsStore } from '@/shared/stores/settings'

const route = useRoute()
const settingsStore = useSettingsStore()
const installPromptStore = useInstallPromptStore()
const appShellStore = useAppShellStore()
const { strings } = storeToRefs(settingsStore)

const showBottomNav = computed(() => route.path === '/groups' || route.path === '/settings')

onMounted(() => {
  installPromptStore.initialize()
  appShellStore.initialize()
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
        <Icon name="home" :size="20" aria-hidden="true" />
        <span>{{ strings.homeTab }}</span>
      </RouterLink>
      <RouterLink class="nav-item" :class="{ 'is-active': route.path === '/settings' }" to="/settings">
        <Icon name="settings" :size="20" aria-hidden="true" />
        <span>{{ strings.settingsTab }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
