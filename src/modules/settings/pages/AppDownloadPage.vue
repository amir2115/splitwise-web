<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import { ApiError } from '@/shared/api/client'
import { fetchAppDownloadContent } from '@/shared/api/appDownload'
import type { AppDownloadContent } from '@/shared/api/types'
import { useSettingsStore } from '@/shared/stores/settings'
import DownloadStoreRail from '@/modules/settings/components/DownloadStoreRail.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const { strings, language } = storeToRefs(settingsStore)

const content = ref<AppDownloadContent | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const fallbackIconUrl = '/android-chrome-192x192.png'
const bazaarLogoUrl = 'https://webassets.cafebazaar.ir/images/home/logo.png'
const myketLogoUrl = 'https://developer.myket.ir/fa/assets/logo/logo.png'

const downloadCards = computed(() => {
  if (!content.value) return []
  return [
    {
      key: 'bazaar',
      title: strings.value.downloadFromBazaar,
      subtitle: 'Cafe Bazaar',
      href: content.value.bazaar_url,
      logoUrl: bazaarLogoUrl,
      accentClass: 'app-download-link--bazaar',
    },
    {
      key: 'myket',
      title: strings.value.downloadFromMyket,
      subtitle: 'Myket',
      href: content.value.myket_url,
      logoUrl: myketLogoUrl,
      accentClass: 'app-download-link--myket',
    },
    {
      key: 'direct',
      title: strings.value.downloadDirect,
      subtitle: content.value.file_size ?? 'APK',
      href: content.value.direct_download_url,
      logoUrl: iconUrl.value,
      accentClass: 'app-download-link--direct',
    },
  ].filter((item) => Boolean(item.href)) as Array<{
    key: string
    title: string
    subtitle: string
    href: string
    logoUrl: string
    accentClass: string
  }>
})

const versionMeta = computed(() => {
  if (!content.value) return []
  return [
    { label: strings.value.downloadVersionNameLabel, value: content.value.version_name },
    { label: strings.value.downloadVersionCodeLabel, value: content.value.version_code?.toString() ?? null },
    { label: strings.value.downloadReleaseDateLabel, value: formatDate(content.value.release_date) },
    { label: strings.value.downloadFileSizeLabel, value: content.value.file_size },
  ].filter((item) => Boolean(item.value))
})

const iconUrl = computed(() => content.value?.app_icon_url || fallbackIconUrl)

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language.value === 'fa' ? 'fa-IR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    content.value = await fetchAppDownloadContent()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : strings.value.networkError
    content.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="page-shell page-stack">
    <PageTopBar :title="strings.downloadPageTitle" can-go-back @back="router.back()" />

    <div v-if="loading" class="surface-card app-download-loading">
      <strong>{{ strings.loading }}</strong>
    </div>

    <template v-else-if="content">
      <section class="app-download-hero">
        <div class="app-download-hero__backdrop"></div>
        <div class="app-download-hero__content">
          <div class="app-download-hero__header">
            <div class="app-download-hero__icon-frame">
              <img :src="iconUrl" :alt="content.title" class="app-download-hero__icon" />
            </div>
            <div class="page-stack" style="gap: 8px;">
              <span v-if="content.primary_badge_text" class="app-download-badge">{{ content.primary_badge_text }}</span>
              <h1 class="app-download-hero__title">{{ content.title }}</h1>
              <p class="app-download-hero__subtitle">{{ content.subtitle }}</p>
            </div>
          </div>

          <div v-if="versionMeta.length" class="app-download-meta-grid">
            <article v-for="item in versionMeta" :key="item.label" class="app-download-meta-card">
              <span class="muted">{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </div>
      </section>

      <section class="page-stack" style="gap: 14px;">
        <div class="section-heading">
          <strong>{{ strings.downloadStoresTitle }}</strong>
        </div>
        <div v-if="downloadCards.length" class="app-download-links-mobile">
          <DownloadStoreRail :items="downloadCards" />
        </div>
        <div v-if="downloadCards.length" class="app-download-links">
          <a
            v-for="item in downloadCards"
            :key="item.key"
            class="app-download-link"
            :class="item.accentClass"
            :href="item.href ?? undefined"
            target="_blank"
            rel="noreferrer"
          >
            <div class="app-download-link__logo-wrap">
              <img :src="item.logoUrl" :alt="item.title" class="app-download-link__logo" />
            </div>
            <div class="page-stack app-download-link__content" style="gap: 4px;">
              <strong>{{ item.title }}</strong>
              <span>{{ item.subtitle }}</span>
            </div>
            <span class="app-download-link__arrow">↙</span>
          </a>
        </div>
        <div v-else class="surface-card app-download-empty">
          <strong>{{ strings.downloadPageEmptyTitle }}</strong>
          <p class="muted">{{ strings.downloadPageEmptySubtitle }}</p>
        </div>
      </section>

      <section class="app-download-notes">
        <div class="section-heading">
          <strong>{{ strings.downloadVersionNotesTitle }}</strong>
        </div>
        <ul class="app-download-notes__list">
          <li v-for="note in content.release_notes" :key="note" class="app-download-notes__item">
            <span class="app-download-notes__dot"></span>
            <span>{{ note }}</span>
          </li>
        </ul>
      </section>
    </template>

    <div v-else class="surface-card app-download-error-card page-stack">
      <div class="app-download-error-card__icon">!</div>
      <strong class="app-download-error-card__title">{{ strings.downloadPageErrorTitle }}</strong>
      <p class="app-download-error-card__message">{{ errorMessage ?? strings.downloadPageErrorBody }}</p>
      <button class="filled-button app-download-error-card__button" type="button" @click="load">{{ strings.retry }}</button>
    </div>
  </div>
</template>

<style scoped>
.app-download-loading,
.app-download-empty,
.app-download-notes,
.app-download-error-card {
  padding: 20px;
}

.app-download-hero {
  position: relative;
  overflow: hidden;
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(255, 196, 93, 0.28), transparent 32%),
    radial-gradient(circle at top left, rgba(27, 166, 114, 0.18), transparent 28%),
    linear-gradient(145deg, #102234 0%, #173d4d 44%, #f4f0e7 180%);
  color: #f8fafc;
  box-shadow: 0 24px 56px rgba(15, 23, 42, 0.22);
}

.app-download-hero__backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 42%),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03) 10px, transparent 10px, transparent 22px);
  pointer-events: none;
}

.app-download-hero__content {
  position: relative;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.app-download-hero__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.app-download-hero__icon-frame {
  width: 88px;
  height: 88px;
  border-radius: 28px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.app-download-hero__icon {
  width: 100%;
  height: 100%;
  border-radius: 22px;
  object-fit: cover;
  display: block;
  background: rgba(255, 255, 255, 0.22);
}

.app-download-badge {
  width: fit-content;
  min-height: 30px;
  padding: 4px 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 13px;
}

.app-download-hero__title {
  margin: 0;
  font-size: clamp(28px, 5vw, 38px);
  line-height: 1.1;
}

.app-download-hero__subtitle {
  margin: 0;
  max-width: 42ch;
  color: rgba(241, 245, 249, 0.88);
  line-height: 1.7;
}

.app-download-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 12px;
}

.app-download-meta-card {
  padding: 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-download-meta-card .muted {
  color: rgba(241, 245, 249, 0.72);
}

.app-download-meta-card strong {
  color: #f8fafc;
}

.section-heading strong {
  font-size: 18px;
  line-height: 28px;
}

.app-download-links-mobile {
  display: none !important;
}

.app-download-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.app-download-link {
  min-height: 128px;
  padding: 20px;
  border-radius: 28px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: #0f172a;
  box-shadow: 0 20px 42px rgba(15, 23, 42, 0.08);
}

.app-download-link__logo-wrap {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.68);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
}

.app-download-link__logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  display: block;
}

.app-download-link__content {
  text-align: start;
}

.app-download-link span {
  color: rgba(15, 23, 42, 0.68);
}

.app-download-link--bazaar {
  background: linear-gradient(140deg, #dcfce7, #84cc16);
}

.app-download-link--myket {
  background: linear-gradient(140deg, #dbeafe, #1d4ed8);
}

.app-download-link--direct {
  background: linear-gradient(140deg, #d9f3f1, #0f766e);
}

.app-download-link__arrow {
  font-size: 22px;
  color: rgba(15, 23, 42, 0.9);
}

.app-download-notes {
  border-radius: 28px;
  border: 1px solid color-mix(in srgb, var(--color-outline) 12%, transparent);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 32%),
    var(--color-surface);
}

.app-download-notes__list {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.app-download-notes__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.app-download-notes__dot {
  width: 10px;
  height: 10px;
  margin-top: 9px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--color-primary), #ffb84d);
}

.app-download-error-card {
  align-items: center;
  text-align: center;
  gap: 10px;
}

.app-download-error-card__icon {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-error) 14%, var(--color-surface));
  color: var(--color-error);
  font-size: 28px;
  font-weight: 800;
}

.app-download-error-card__title {
  font-size: 22px;
  line-height: 32px;
}

.app-download-error-card__message {
  max-width: 48ch;
  margin: 0;
  color: var(--color-on-surface-variant);
  line-height: 1.9;
}

.app-download-error-card__button {
  width: auto;
  min-width: 136px;
}

:global(:root[data-theme='light']) .app-download-link__arrow,
:global(:root[data-theme='light']) .app-download-link span {
  color: rgba(16, 32, 35, 0.72);
}

@media (max-width: 900px) {
  .app-download-links-mobile {
    display: block !important;
  }

  .app-download-links {
    display: none;
  }
}

@media (max-width: 640px) {
  .app-download-hero__header {
    grid-template-columns: 1fr;
  }

  .app-download-hero__icon-frame {
    width: 74px;
    height: 74px;
  }
}

@media (max-width: 520px) {
  .app-download-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
