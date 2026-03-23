<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useInstallPromptStore } from '@/shared/stores/installPrompt'
import { useSettingsStore } from '@/shared/stores/settings'

const installPromptStore = useInstallPromptStore()
const settingsStore = useSettingsStore()

const { strings } = storeToRefs(settingsStore)
const { canPromptInstall, shouldShowIosHelp, shouldShowPrompt } = storeToRefs(installPromptStore)
const showInstallAction = computed(() => canPromptInstall.value)

const title = computed(() => (shouldShowIosHelp.value ? strings.value.iosInstallTitle : strings.value.installAppTitle))
const body = computed(() => (shouldShowIosHelp.value ? strings.value.iosInstallBody : strings.value.installAppBody))

async function handlePrimaryAction() {
  await installPromptStore.promptInstall()
}
</script>

<template>
  <Transition name="feature-transition">
    <aside v-if="shouldShowPrompt" class="install-banner surface-card">
      <div class="install-banner__content">
        <strong>{{ title }}</strong>
        <span>{{ body }}</span>
      </div>
      <div class="install-banner__actions">
        <button class="outline-button" type="button" @click="installPromptStore.dismissPrompt()">
          {{ strings.installAppDismiss }}
        </button>
        <button
          v-if="showInstallAction"
          class="filled-button install-banner__button"
          type="button"
          @click="handlePrimaryAction"
        >
          {{ strings.installAppAction }}
        </button>
      </div>
    </aside>
  </Transition>
</template>
