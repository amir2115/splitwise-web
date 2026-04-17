<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import HeroCard from '@/shared/components/HeroCard.vue'
import { ApiError } from '@/shared/api/client'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const { strings } = storeToRefs(settingsStore)
const { isSubmitting } = storeToRefs(authStore)

const form = reactive({
  name: '',
  username: '',
  password: '',
})

const errorMessage = ref('')
const loadingLabel = computed(() => strings.value.registerLoading)

async function submit() {
  errorMessage.value = ''

  if (!form.name.trim()) {
    errorMessage.value = strings.value.nameRequired
    return
  }

  if (!form.username.trim()) {
    errorMessage.value = strings.value.usernameRequired
    return
  }

  if (!form.password) {
    errorMessage.value = strings.value.passwordRequired
    return
  }

  if (form.password.length < 8) {
    errorMessage.value = strings.value.passwordTooShort
    return
  }

  try {
    await authStore.register({
      name: form.name.trim(),
      username: form.username.trim(),
      password: form.password,
    })
    router.replace('/groups')
  } catch (error) {
    errorMessage.value = resolveAuthError(error, true, strings.value)
  }
}

function resolveAuthError(error: unknown, isRegister: boolean, appStrings: typeof strings.value) {
  if (error instanceof TypeError) return appStrings.networkError

  if (error instanceof ApiError) {
    const message = error.message.toLowerCase()
    if (isRegister && message.includes('password') && (message.includes('8') || message.includes('eight') || message.includes('at least'))) {
      return appStrings.passwordTooShort
    }
    if (isRegister && (error.status === 409 || message.includes('already') || message.includes('taken') || message.includes('exists'))) {
      return appStrings.usernameTaken
    }
    if (
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('load failed')
    ) {
      return appStrings.networkError
    }
  }

  return isRegister ? appStrings.registerFailed : appStrings.loginFailed
}
</script>

<template>
  <div class="page-shell auth-page-shell">
    <div class="auth-card surface-card page-stack auth-form-card">
      <HeroCard :title="strings.registerTitle" :subtitle="strings.registerSubtitle" icon="◎" />
      <div class="form-field">
        <label class="form-field__label">{{ strings.nameLabel }}</label>
        <input v-model="form.name" class="text-input" type="text" autocomplete="name" :disabled="isSubmitting" />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.usernameLabel }}</label>
        <input v-model="form.username" class="text-input" type="text" autocomplete="username" :disabled="isSubmitting" />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.passwordLabel }}</label>
        <input v-model="form.password" class="text-input" type="password" autocomplete="new-password" :disabled="isSubmitting" />
      </div>
      <Transition name="auth-error-transition">
        <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
          <strong>{{ strings.authErrorTitle }}</strong>
          <span>{{ errorMessage }}</span>
        </div>
      </Transition>
      <button class="filled-button" type="button" :disabled="isSubmitting" @click="submit">
        <span v-if="isSubmitting" class="button-loader" aria-hidden="true"></span>
        {{ isSubmitting ? loadingLabel : strings.registerAction }}
      </button>
      <RouterLink to="/auth/login" class="auth-link">{{ strings.goToLogin }}</RouterLink>
    </div>
  </div>
</template>
