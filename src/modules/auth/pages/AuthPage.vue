<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import HeroCard from '@/shared/components/HeroCard.vue'
import { ApiError } from '@/shared/api/client'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { strings } = storeToRefs(settingsStore)
const { isSubmitting } = storeToRefs(authStore)

const form = reactive({
  name: '',
  username: '',
  password: '',
})

const isRegisterMode = ref(route.meta.authMode === 'register')
const errorMessage = ref('')

watch(
  () => route.meta.authMode,
  (value) => {
    isRegisterMode.value = value === 'register'
    errorMessage.value = ''
  },
  { immediate: true },
)

const loadingLabel = computed(() => (isRegisterMode.value ? strings.value.registerLoading : strings.value.loginLoading))
const heroTitle = computed(() => (isRegisterMode.value ? strings.value.registerTitle : strings.value.loginTitle))
const heroSubtitle = computed(() => (isRegisterMode.value ? strings.value.registerSubtitle : strings.value.loginSubtitle))

async function submit() {
  errorMessage.value = ''

  if (isRegisterMode.value && !form.name.trim()) {
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

  try {
    if (isRegisterMode.value) {
      await authStore.register({
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
      })
    } else {
      await authStore.login({
        username: form.username.trim(),
        password: form.password,
      })
    }
    router.replace('/groups')
  } catch (error) {
    errorMessage.value = resolveAuthError(error, isRegisterMode.value, strings.value)
  }
}

function switchMode() {
  router.replace(isRegisterMode.value ? '/auth/login' : '/auth/register')
}

function resolveAuthError(error: unknown, isRegister: boolean, appStrings: typeof strings.value) {
  if (error instanceof TypeError) return appStrings.networkError

  if (error instanceof ApiError) {
    const message = error.message.toLowerCase()
    if (!isRegister && error.status === 401) return appStrings.invalidCredentials
    if (isRegister && (error.status === 409 || message.includes('already') || message.includes('taken') || message.includes('exists'))) {
      return appStrings.usernameTaken
    }
    if (message.includes('failed to fetch') || message.includes('network') || message.includes('load failed')) {
      return appStrings.networkError
    }
  }

  return isRegister ? appStrings.registerFailed : appStrings.loginFailed
}
</script>

<template>
  <div class="page-shell auth-page-shell">
    <div class="auth-card surface-card page-stack auth-form-card">
      <HeroCard :title="heroTitle" :subtitle="heroSubtitle" :icon="isRegisterMode ? '◎' : '◌'" />
      <div v-if="isRegisterMode" class="form-field">
        <label class="form-field__label">{{ strings.nameLabel }}</label>
        <input v-model="form.name" class="text-input" type="text" autocomplete="name" :disabled="isSubmitting" />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.usernameLabel }}</label>
        <input v-model="form.username" class="text-input" type="text" autocomplete="username" :disabled="isSubmitting" />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ strings.passwordLabel }}</label>
        <input
          v-model="form.password"
          class="text-input"
          :type="'password'"
          :autocomplete="isRegisterMode ? 'new-password' : 'current-password'"
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
        {{ isSubmitting ? loadingLabel : (isRegisterMode ? strings.registerAction : strings.loginAction) }}
      </button>
      <button class="auth-link auth-link--button" type="button" :disabled="isSubmitting" @click="switchMode">
        {{ isRegisterMode ? strings.goToLogin : strings.goToRegister }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.auth-link--button {
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
}
</style>
