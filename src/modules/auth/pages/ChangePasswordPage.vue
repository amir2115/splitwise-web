<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { strings } = storeToRefs(settingsStore)
const { isSubmitting } = storeToRefs(authStore)

const form = reactive({
  currentPassword: '',
  newPassword: '',
})
const errorMessage = ref('')

const loadingLabel = computed(() => strings.value.changePasswordLoading)

async function submit() {
  errorMessage.value = ''

  if (!form.currentPassword) {
    errorMessage.value = strings.value.currentPasswordRequired
    return
  }

  if (!form.newPassword) {
    errorMessage.value = strings.value.passwordRequired
    return
  }

  if (form.newPassword.length < 8) {
    errorMessage.value = strings.value.passwordTooShort
    return
  }

  try {
    await authStore.changePassword({
      current_password: form.currentPassword,
      new_password: form.newPassword,
    })
    router.replace('/groups')
  } catch (error) {
    errorMessage.value = resolveChangePasswordError(error, strings.value)
  }
}

function resolveChangePasswordError(error: unknown, appStrings: typeof strings.value) {
  if (error instanceof TypeError) return appStrings.networkError
  if (error instanceof ApiError) {
    const message = error.message.toLowerCase()
    if (error.status === 401) return appStrings.currentPasswordInvalid
    if (message.includes('password') && (message.includes('8') || message.includes('least'))) return appStrings.passwordTooShort
    if (message.includes('failed to fetch') || message.includes('network') || message.includes('load failed')) return appStrings.networkError
  }
  return appStrings.changePasswordFailed
}
</script>

<template>
  <div class="page-shell auth-page-shell">
    <div class="auth-card surface-card page-stack auth-form-card">
      <HeroCard :title="strings.changePasswordTitle" :subtitle="strings.changePasswordSubtitle" icon="◍" />
      <div class="form-field">
        <label class="form-field__label">{{ strings.currentPasswordLabel }}</label>
        <input
          v-model="form.currentPassword"
          class="text-input"
          type="password"
          autocomplete="current-password"
          :disabled="isSubmitting"
        />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.newPasswordLabel }}</label>
        <input
          v-model="form.newPassword"
          class="text-input"
          type="password"
          autocomplete="new-password"
          :disabled="isSubmitting"
        />
      </div>
      <Transition name="auth-error-transition">
        <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
          <strong>{{ strings.authErrorTitle }}</strong>
          <span>{{ errorMessage }}</span>
        </div>
      </Transition>
      <button class="filled-button" type="button" :disabled="isSubmitting" @click="submit">
        <span v-if="isSubmitting" class="button-loader" aria-hidden="true"></span>
        {{ isSubmitting ? loadingLabel : strings.changePasswordAction }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.auth-form-card {
  gap: 18px;
}

.text-input {
  border-radius: 22px;
  min-height: 54px;
  padding-inline: 18px;
}
</style>
