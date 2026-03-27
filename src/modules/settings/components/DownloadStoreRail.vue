<script setup lang="ts">
export interface DownloadStoreRailItem {
  key: string
  title: string
  subtitle: string
  href: string
  logoUrl: string
  accentClass: string
}

defineProps<{
  items: DownloadStoreRailItem[]
}>()
</script>

<template>
  <div
    class="download-store-rail"
    role="list"
    style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:stretch;width:100%;"
  >
    <a
      v-for="item in items"
      :key="item.key"
      class="download-store-rail__card"
      :class="item.accentClass"
      :href="item.href"
      target="_blank"
      rel="noreferrer"
      role="listitem"
      style="width:100%;"
    >
      <div class="download-store-rail__logo-wrap">
        <img :src="item.logoUrl" :alt="item.title" class="download-store-rail__logo" />
      </div>
      <div class="page-stack" style="gap: 2px;">
        <strong>{{ item.title }}</strong>
        <span>{{ item.subtitle }}</span>
      </div>
    </a>
  </div>
</template>

<style scoped>
.download-store-rail {
}

.download-store-rail__card {
  min-width: 0;
  min-height: 102px;
  padding: 12px 10px;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #102023;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  text-align: center;
}

.download-store-rail__logo-wrap {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.72);
}

.download-store-rail__logo {
  width: 26px;
  height: 26px;
  object-fit: contain;
  display: block;
}

.download-store-rail__card strong {
  font-size: 13px;
  line-height: 1.45;
}

.download-store-rail__card span {
  color: rgba(16, 32, 35, 0.72);
  font-size: 11px;
  line-height: 1.4;
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

:global(:root[data-theme='dark']) .download-store-rail__card {
  color: #0f172a;
}

:global(:root[data-theme='dark']) .download-store-rail__card span {
  color: rgba(15, 23, 42, 0.7);
}

@media (max-width: 420px) {
  .download-store-rail__card {
    min-height: 96px;
    padding: 10px 8px;
    border-radius: 18px;
  }

  .download-store-rail__card strong {
    font-size: 12px;
  }

  .download-store-rail__card span {
    font-size: 10px;
  }
}
</style>
