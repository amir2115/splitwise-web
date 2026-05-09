<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import Icon from '@/shared/components/Icon.vue'
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

const iconUrl = computed(() => content.value?.app_icon_url || fallbackIconUrl)

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
  <div class="page-shell page-stack download-page">
    <PageTopBar :title="strings.downloadPageTitle" can-go-back sticky @back="router.back()" />

    <div v-if="loading" class="surface-card download-loading">
      <strong>{{ strings.loading }}</strong>
    </div>

    <template v-else-if="content">
      <!-- Hero -->
      <section class="download-hero">
        <div class="download-hero__icon-frame">
          <img :src="iconUrl" :alt="content.title" class="download-hero__icon" />
        </div>
        <div class="download-hero__content">
          <span v-if="content.primary_badge_text" class="chip chip--brand download-hero__badge">{{ content.primary_badge_text }}</span>
          <h1 class="download-hero__title">{{ content.title }}</h1>
          <p class="download-hero__subtitle">{{ content.subtitle }}</p>
        </div>
      </section>

      <!-- Meta -->
      <div v-if="versionMeta.length" class="download-meta">
        <article v-for="item in versionMeta" :key="item.label" class="download-meta__card">
          <span class="muted">{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>

      <!-- Stores -->
      <h3 class="eyebrow">{{ strings.downloadStoresTitle }}</h3>
      <div v-if="downloadCards.length" class="download-store-mobile">
        <DownloadStoreRail :items="downloadCards" />
      </div>
      <div v-if="downloadCards.length" class="download-store-desktop">
        <a
          v-for="item in downloadCards"
          :key="item.key"
          class="download-store-card"
          :href="item.href ?? undefined"
          target="_blank"
          rel="noreferrer"
        >
          <div class="download-store-card__logo">
            <img :src="item.logoUrl" :alt="item.title" />
          </div>
          <div class="download-store-card__body">
            <strong>{{ item.title }}</strong>
            <span class="muted">{{ item.subtitle }}</span>
          </div>
          <span class="download-store-card__arrow" aria-hidden="true">
            <Icon name="download" :size="14" />
          </span>
        </a>
      </div>
      <EmptyStateCard
        v-else
        :title="strings.downloadPageEmptyTitle"
        :subtitle="strings.downloadPageEmptySubtitle"
      />

      <!-- Release notes -->
      <h3 class="eyebrow">{{ strings.downloadVersionNotesTitle }}</h3>
      <ul class="download-notes">
        <li v-for="note in content.release_notes" :key="note" class="download-notes__item">
          <span class="download-notes__dot" aria-hidden="true"></span>
          <span>{{ note }}</span>
        </li>
      </ul>
    </template>

    <div v-else class="surface-card download-error">
      <div class="download-error__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7v6"/>
          <circle cx="12" cy="16.5" r="0.7" fill="currentColor"/>
        </svg>
      </div>
      <strong class="download-error__title">{{ strings.downloadPageErrorTitle }}</strong>
      <p class="download-error__message">{{ errorMessage ?? strings.downloadPageErrorBody }}</p>
      <button class="filled-button" type="button" @click="load">{{ strings.retry }}</button>
    </div>
  </div>
</template>

<style scoped>
.download-page { padding-top: 2px; }

.download-loading {
  text-align: center;
  padding: var(--s-7) var(--s-6);
}

/* Hero */
.download-hero {
  display: flex;
  align-items: center;
  gap: var(--s-5);
  padding: var(--s-6);
  border-radius: var(--r-2xl);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-2);
}
.download-hero__icon-frame {
  width: 72px;
  height: 72px;
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--brand-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.download-hero__icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.download-hero__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.download-hero__badge { align-self: flex-start; }
.download-hero__title {
  margin: 0;
  font-size: var(--t-title);
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
  color: var(--fg);
}
.download-hero__subtitle {
  margin: 0;
  color: var(--fg-muted);
  font-size: var(--t-label);
  line-height: var(--lh-body);
}

/* Meta grid */
.download-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-3);
}
.download-meta__card {
  padding: var(--s-4);
  border-radius: var(--r-xl);
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}
.download-meta__card .muted {
  font-size: var(--t-caption);
}
.download-meta__card strong {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
}

/* Store cards (desktop) */
.download-store-desktop {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}
.download-store-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  text-decoration: none;
  color: var(--fg);
  transition: transform var(--d-fast) var(--ease-standard), box-shadow var(--d-fast) var(--ease-standard);
  box-shadow: var(--shadow-1);
}
.download-store-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-2);
}
.download-store-card__logo {
  width: 44px;
  height: 44px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.download-store-card__logo img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}
.download-store-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.download-store-card__body strong {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
}
.download-store-card__arrow { color: var(--brand); }

/* Mobile rail */
.download-store-mobile { display: none; }
@media (max-width: 560px) {
  .download-store-mobile { display: block; }
  .download-store-desktop { display: none; }
  .download-meta { grid-template-columns: 1fr; }
  .download-hero { flex-direction: column; align-items: flex-start; gap: var(--s-4); padding: var(--s-5); }
}

/* Notes */
.download-notes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}
.download-notes__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--s-3);
  align-items: flex-start;
  padding: var(--s-3) 0;
  border-bottom: 1px solid var(--divider);
  color: var(--fg);
  font-size: var(--t-body);
  line-height: var(--lh-body);
}
.download-notes__item:last-child { border-bottom: 0; }
.download-notes__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  margin-top: 8px;
}

/* Error state */
.download-error {
  text-align: center;
  padding: var(--s-7) var(--s-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
}
.download-error__icon {
  width: 44px;
  height: 44px;
  border-radius: var(--r-md);
  background: var(--neg-soft);
  color: var(--neg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.download-error__title {
  font-size: var(--t-h2);
  font-weight: var(--fw-semibold);
}
.download-error__message {
  margin: 0;
  color: var(--fg-muted);
  font-size: var(--t-label);
  line-height: var(--lh-body);
}
</style>
