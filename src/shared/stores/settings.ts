import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { AppLanguage, ThemeMode } from '@/shared/api/types'
import { readLanguage, readThemeMode, writeLanguage, writeThemeMode } from '@/shared/utils/storage'
import { stringsFor } from '@/shared/i18n/strings'

export const useSettingsStore = defineStore('settings', () => {
  const language = ref<AppLanguage>(readLanguage())
  const themeMode = ref<ThemeMode>(readThemeMode())

  const strings = computed(() => stringsFor(language.value))
  const direction = computed(() => (language.value === 'fa' ? 'rtl' : 'ltr'))

  watch(language, (value) => {
    writeLanguage(value)
    document.documentElement.lang = value
    document.documentElement.dir = value === 'fa' ? 'rtl' : 'ltr'
  }, { immediate: true })

  watch(themeMode, (value) => {
    writeThemeMode(value)
    document.documentElement.dataset.theme = value
  }, { immediate: true })

  function setLanguage(value: AppLanguage) {
    language.value = value
  }

  function setThemeMode(value: ThemeMode) {
    themeMode.value = value
  }

  return {
    language,
    themeMode,
    direction,
    strings,
    setLanguage,
    setThemeMode,
  }
})
