<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import { useSettingsStore } from '@/shared/stores/settings'
import { useAuthStore } from '@/shared/stores/auth'

const router = useRouter()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const { strings, language, themeMode } = storeToRefs(settingsStore)
const { user } = storeToRefs(authStore)

const accountLabel = computed(() => {
  if (!user.value) return strings.value.accountGuestSubtitle
  return user.value.name?.trim()
    ? `${user.value.name} (@${user.value.username})`
    : `@${user.value.username}`
})

function signOut() {
  authStore.clearSession()
  router.replace('/auth/login')
}
</script>

<template>
  <div class="page-shell page-stack">
    <HeroCard :title="strings.settingsHeroTitle" :subtitle="strings.settingsHeroSubtitle" icon="⚙" />

    <section class="account-section-card">
      <div class="page-stack" style="gap: 14px;">
        <strong class="settings-section-title">{{ strings.accountTitle }}</strong>
        <div class="settings-account-row">
          <div class="settings-account-meta">
            <strong>{{ accountLabel }}</strong>
          </div>
          <button v-if="user" class="outline-button is-danger settings-logout-button" type="button" @click="signOut">
            {{ strings.signOut }}
          </button>
        </div>
      </div>
    </section>

    <section class="settings-section-card">
      <strong class="settings-section-title">{{ strings.languageTitle }}</strong>
      <div class="settings-chip-row">
        <button class="setting-option" :class="{ 'is-selected': language === 'fa' }" type="button" @click="settingsStore.setLanguage('fa')">
          {{ strings.persianLabel }}
        </button>
        <button class="setting-option" :class="{ 'is-selected': language === 'en' }" type="button" @click="settingsStore.setLanguage('en')">
          {{ strings.englishLabel }}
        </button>
      </div>
    </section>

    <section class="settings-section-card">
      <strong class="settings-section-title">{{ strings.themeTitle }}</strong>
      <div class="settings-chip-row">
        <button class="setting-option" :class="{ 'is-selected': themeMode === 'light' }" type="button" @click="settingsStore.setThemeMode('light')">
          {{ strings.lightLabel }}
        </button>
        <button class="setting-option" :class="{ 'is-selected': themeMode === 'dark' }" type="button" @click="settingsStore.setThemeMode('dark')">
          {{ strings.darkLabel }}
        </button>
      </div>
    </section>
  </div>
</template>
