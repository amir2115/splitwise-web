<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import Avatar from '@/shared/components/Avatar.vue'
import Icon from '@/shared/components/Icon.vue'
import { useSettingsStore } from '@/shared/stores/settings'
import { useAuthStore } from '@/shared/stores/auth'
import { useAppShellStore } from '@/shared/stores/appShell'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const appShellStore = useAppShellStore()

const { strings, language, themeMode } = storeToRefs(settingsStore)
const { user, isAuthenticated } = storeToRefs(authStore)
const { hasInternet, isApiReachable, lastHealthWasSuccessful, isCheckingHealth, lastCheckedAt } = storeToRefs(appShellStore)

const canSync = computed(() => isAuthenticated.value)
const effectiveOnline = computed(() => lastHealthWasSuccessful.value || isApiReachable.value)
const isRtl = computed(() => settingsStore.direction === 'rtl')

const accountLabel = computed(() => {
  if (!user.value) return strings.value.accountGuestSubtitle
  return user.value.name?.trim()
    ? user.value.name
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
  <div class="page-shell page-stack settings-page">
    <PageTopBar :title="strings.settingsHeroTitle" />

    <!-- Account row card -->
    <section class="surface-card account-row">
      <Avatar :name="user?.name ?? 'Guest'" tone="brand" :size="44" />
      <div class="account-row__meta">
        <strong>{{ accountLabel }}</strong>
        <span v-if="user?.username" class="muted"><UsernameHandle :username="user.username" /></span>
        <span v-else class="muted">{{ strings.accountGuestSubtitle }}</span>
        <span v-if="user?.phone_number" class="muted account-row__phone">{{ user.phone_number }}</span>
      </div>
      <span v-if="canSync && effectiveOnline" class="chip chip--pos">
        <Icon name="check" :size="10" />
        {{ strings.syncOnline }}
      </span>
      <span v-else-if="canSync" class="chip chip--neg">{{ strings.syncOffline }}</span>
    </section>

    <span v-if="phoneVerificationLabel" class="chip" :class="user?.is_phone_verified ? 'chip--pos' : 'chip--warn'">{{ phoneVerificationLabel }}</span>

    <!-- Preferences group -->
    <h3 class="eyebrow">{{ strings.languageTitle }} / {{ strings.themeTitle }}</h3>
    <div class="surface-card prefs-group">
      <div class="prefs-row">
        <div class="prefs-row__label">{{ strings.languageTitle }}</div>
        <div class="segmented">
          <button class="segmented__btn" :class="{ 'is-active': language === 'en' }" type="button" @click="settingsStore.setLanguage('en')">EN</button>
          <button class="segmented__btn" :class="{ 'is-active': language === 'fa' }" type="button" @click="settingsStore.setLanguage('fa')">FA</button>
        </div>
      </div>
      <div class="prefs-row">
        <div class="prefs-row__label">{{ strings.themeTitle }}</div>
        <div class="segmented">
          <button class="segmented__btn" :class="{ 'is-active': themeMode === 'light' }" type="button" @click="settingsStore.setThemeMode('light')">
            <Icon name="sun" :size="12" />
          </button>
          <button class="segmented__btn" :class="{ 'is-active': themeMode === 'dark' }" type="button" @click="settingsStore.setThemeMode('dark')">
            <Icon name="moon" :size="12" />
          </button>
        </div>
      </div>
    </div>

    <!-- Sync -->
    <section class="surface-card sync-card">
      <div class="sync-card__header">
        <strong>{{ strings.syncTitle }}</strong>
        <span class="chip" :class="effectiveOnline && canSync ? 'chip--pos' : 'chip--neg'">{{ syncStatusText }}</span>
      </div>
      <span class="muted sync-card__sub">{{ lastCheckedLabel }}</span>
      <span class="muted">{{ syncSupportingText }}</span>
      <button class="outline-button sync-card__action" type="button" :disabled="isCheckingHealth" @click="canSync ? appShellStore.refreshConnectionStatus() : signIn()">
        {{ !canSync ? strings.signInLabel : (isCheckingHealth ? strings.syncInProgress : strings.syncNow) }}
      </button>
    </section>

    <!-- Download -->
    <button class="settings-link" type="button" @click="router.push('/download-app')">
      <span class="settings-link__icon" aria-hidden="true">
        <Icon name="download" :size="18" />
      </span>
      <div class="settings-link__body">
        <strong>{{ strings.downloadApplicationTitle }}</strong>
        <span class="muted">{{ strings.downloadApplicationSubtitle }}</span>
      </div>
      <span class="settings-link__chev">
        <Icon :name="isRtl ? 'chevron-left' : 'chevron-right'" :size="14" />
      </span>
    </button>

    <!-- Sign out / Sign in -->
    <button v-if="user" class="outline-button is-danger" type="button" @click="signOut">{{ strings.logoutLabel }}</button>
    <button v-else class="filled-button" type="button" @click="signIn">{{ strings.signInLabel }}</button>
  </div>
</template>

<style scoped>
.settings-page { padding-top: 2px; }

.account-row {
  display: flex;
  align-items: center;
  gap: var(--s-4);
}
.account-row__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.account-row__meta strong {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
}
.account-row__phone {
  direction: ltr;
  unicode-bidi: plaintext;
  font-variant-numeric: tabular-nums;
}

.prefs-group {
  padding: 0;
  overflow: hidden;
}
.prefs-row {
  padding: var(--s-4) var(--s-5);
  display: flex;
  align-items: center;
  gap: var(--s-4);
  border-bottom: 1px solid var(--divider);
}
.prefs-row:last-of-type { border-bottom: 0; }
.prefs-row__label {
  flex: 1;
  font-size: var(--t-body);
}

.sync-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.sync-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  margin-bottom: var(--s-1);
}
.sync-card__sub {
  font-size: var(--t-caption);
}
.sync-card__action {
  margin-top: var(--s-3);
  width: 100%;
}

.settings-link {
  width: 100%;
  padding: var(--s-5);
  border-radius: var(--r-xl);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-1);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--s-4);
  align-items: center;
  color: var(--fg);
  text-align: start;
  cursor: pointer;
}
.settings-link__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--r-sm);
  background: var(--accent-soft);
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.settings-link__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.settings-link__body strong {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
}
.settings-link__chev {
  color: var(--fg-subtle);
  display: inline-flex;
}
</style>
