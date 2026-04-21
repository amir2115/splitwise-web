<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppSnackbar from '@/shared/components/AppSnackbar.vue'
import InstallPromptBanner from '@/shared/components/InstallPromptBanner.vue'
import PhoneVerificationModal from '@/modules/auth/components/PhoneVerificationModal.vue'
import { useInstallPromptStore } from '@/shared/stores/installPrompt'
import { useAppShellStore } from '@/shared/stores/appShell'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'

const route = useRoute()
const settingsStore = useSettingsStore()
const installPromptStore = useInstallPromptStore()
const appShellStore = useAppShellStore()
const authStore = useAuthStore()
const { strings } = storeToRefs(settingsStore)
const { requiresPhoneVerification } = storeToRefs(authStore)

const showBottomNav = computed(() => route.path === '/groups' || route.path === '/settings')
const showPhoneVerificationModal = computed(
  () => Boolean(route.meta.requiresAuth) && !route.meta.passwordChangeOnly && !route.path.startsWith('/auth/') && requiresPhoneVerification.value,
)

onMounted(() => {
  installPromptStore.initialize()
  appShellStore.initialize()
})
</script>

<template>
  <div class="app-shell">
    <AppSnackbar />
    <InstallPromptBanner />
    <PhoneVerificationModal v-if="showPhoneVerificationModal" />
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
