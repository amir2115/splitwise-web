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

const settingsLinkArrow = computed(() => (language.value === 'fa' ? '↙' : '↘'))

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

    <button class="settings-link-card" type="button" @click="router.push('/download-app')">
      <div class="settings-link-card__icon">⬇</div>
      <div class="page-stack" style="gap: 4px; text-align: start;">
        <strong>{{ strings.downloadApplicationTitle }}</strong>
        <span class="muted">{{ strings.downloadApplicationSubtitle }}</span>
      </div>
      <span class="settings-link-card__arrow">{{ settingsLinkArrow }}</span>
    </button>
  </div>
</template>

<style scoped>
.settings-link-card {
  width: 100%;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-outline));
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 48%),
    linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)), var(--color-surface));
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  color: var(--color-on-surface);
  text-align: start;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.settings-link-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-primary) 16%, white);
  color: var(--color-primary);
  font-size: 24px;
}

.settings-link-card__arrow {
  color: var(--color-primary);
  font-size: 22px;
  line-height: 1;
  align-self: center;
}
</style>
