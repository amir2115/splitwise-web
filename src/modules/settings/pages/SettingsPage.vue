<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import { useSettingsStore } from '@/shared/stores/settings'
import { useAuthStore } from '@/shared/stores/auth'
import { useAppShellStore } from '@/shared/stores/appShell'

const router = useRouter()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const appShellStore = useAppShellStore()

const { strings, language, themeMode } = storeToRefs(settingsStore)
const { user, isAuthenticated } = storeToRefs(authStore)
const { hasInternet, isApiReachable, lastHealthWasSuccessful, isCheckingHealth, lastCheckedAt } = storeToRefs(appShellStore)

const settingsLinkArrow = computed(() => (language.value === 'fa' ? '↙' : '↘'))
const canSync = computed(() => isAuthenticated.value)
const effectiveOnline = computed(() => lastHealthWasSuccessful.value || isApiReachable.value)

const accountLabel = computed(() => {
  if (!user.value) return strings.value.accountGuestSubtitle
  return user.value.name?.trim()
    ? `${user.value.name} (@${user.value.username})`
    : `@${user.value.username}`
})

const phoneVerificationLabel = computed(() => {
  if (!user.value?.phone_number) return null
  return user.value.is_phone_verified ? strings.value.accountPhoneVerifiedLabel : strings.value.accountPhoneUnverifiedLabel
})

const syncStatusText = computed(() => {
  if (!canSync.value) return strings.value.signInLabel
  return effectiveOnline.value ? strings.value.syncOnline : strings.value.syncOffline
})

const syncSupportingText = computed(() => {
  if (!canSync.value) return strings.value.syncLoginRequired
  if (isCheckingHealth.value) return strings.value.syncInProgress
  if (!hasInternet.value || !isApiReachable.value) return strings.value.syncConnectionIssue
  if (!lastHealthWasSuccessful.value) return strings.value.syncServerIssue
  return strings.value.syncSubtitle
})

const lastCheckedLabel = computed(() => {
  if (!lastCheckedAt.value) return strings.value.notSyncedYet
  const date = new Intl.DateTimeFormat(language.value === 'fa' ? 'fa-IR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(lastCheckedAt.value)
  return strings.value.lastSyncLabel.replace('{date}', date)
})

onMounted(() => {
  appShellStore.initialize()
})

function signOut() {
  authStore.clearSession()
  router.replace('/auth/login')
}

function signIn() {
  authStore.stopGuestMode()
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
            <span v-if="user" class="muted">{{ strings.accountSignedInAs }}</span>
            <span v-if="user?.phone_number" class="muted settings-account-phone">
              {{ strings.accountPhoneLabel }}: {{ user.phone_number }}
            </span>
            <span v-if="phoneVerificationLabel" class="muted settings-account-verification">
              {{ phoneVerificationLabel }}
            </span>
          </div>
          <button v-if="user" class="outline-button is-danger settings-logout-button" type="button" @click="signOut">
            {{ strings.logoutLabel }}
          </button>
          <button v-else class="outline-button settings-logout-button" type="button" @click="signIn">
            {{ strings.signInLabel }}
          </button>
        </div>
      </div>
    </section>

    <section class="settings-section-card">
      <div class="settings-sync-card">
        <div class="settings-sync-card__header">
          <strong class="settings-section-title">{{ strings.syncTitle }}</strong>
          <span class="settings-status-badge" :class="{ 'is-online': effectiveOnline && canSync, 'is-offline': !effectiveOnline || !canSync }">
            {{ syncStatusText }}
          </span>
        </div>
        <div class="settings-sync-card__body">
          <strong class="settings-sync-card__timestamp">{{ lastCheckedLabel }}</strong>
          <span class="muted settings-sync-card__support">{{ syncSupportingText }}</span>
        </div>
        <button class="outline-button settings-sync-card__action" type="button" :disabled="isCheckingHealth" @click="canSync ? appShellStore.refreshConnectionStatus() : signIn()">
          {{ !canSync ? strings.signInLabel : (isCheckingHealth ? strings.syncInProgress : strings.syncNow) }}
        </button>
      </div>
    </section>

    <section class="settings-section-card settings-choice-card">
      <div class="settings-choice-card__body">
        <strong class="settings-section-title">{{ strings.languageTitle }}</strong>
        <div class="muted settings-choice-card__subtitle">{{ strings.languageSubtitle }}</div>
      </div>
      <div class="settings-chip-row settings-choice-card__chips">
        <button class="setting-option" :class="{ 'is-selected': language === 'fa' }" type="button" @click="settingsStore.setLanguage('fa')">
          {{ strings.persianLabel }}
        </button>
        <button class="setting-option" :class="{ 'is-selected': language === 'en' }" type="button" @click="settingsStore.setLanguage('en')">
          {{ strings.englishLabel }}
        </button>
      </div>
    </section>

    <section class="settings-section-card settings-choice-card">
      <div class="settings-choice-card__body">
        <strong class="settings-section-title">{{ strings.themeTitle }}</strong>
        <div class="muted settings-choice-card__subtitle">{{ strings.themeSubtitle }}</div>
      </div>
      <div class="settings-chip-row settings-choice-card__chips">
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
.settings-sync-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-sync-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.settings-sync-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-sync-card__timestamp {
  line-height: 1.7;
}

.settings-sync-card__support {
  line-height: 1.8;
}

.settings-sync-card__action {
  width: 100%;
}

.settings-status-badge {
  min-height: 30px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  background: var(--color-status-settled-bg);
  color: var(--color-status-settled);
}

.settings-status-badge.is-online {
  background: var(--color-status-creditor-bg);
  color: var(--color-status-creditor);
}

.settings-status-badge.is-offline {
  background: color-mix(in srgb, var(--color-error) 14%, transparent);
  color: var(--color-error);
}

.settings-choice-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.settings-choice-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-choice-card__subtitle {
  line-height: 1.8;
}

.settings-choice-card__chips {
  justify-content: flex-start;
  align-items: center;
}

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

.settings-account-phone {
  direction: ltr;
  unicode-bidi: plaintext;
  font-variant-numeric: tabular-nums;
}

.settings-account-verification {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

@media (max-width: 560px) {
  .settings-sync-card__header {
    gap: 10px;
  }
}
</style>
