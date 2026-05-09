<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { ApiError } from '@/shared/api/client'
import Icon from '@/shared/components/Icon.vue'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const { strings } = storeToRefs(settingsStore)
const { isSubmitting } = storeToRefs(authStore)

const form = reactive({
  username: '',
  password: '',
})

const errorMessage = ref('')
const showPassword = ref(false)
const loadingLabel = computed(() => strings.value.loginLoading)

async function submit() {
  errorMessage.value = ''

  if (!form.username.trim()) {
    errorMessage.value = strings.value.usernameRequired
    return
  }

  if (!form.password) {
    errorMessage.value = strings.value.passwordRequired
    return
  }

  try {
    await authStore.login({
      username: form.username.trim(),
      password: form.password,
    })
    router.replace('/groups')
  } catch (error) {
    errorMessage.value = resolveAuthError(error, false, strings.value)
  }
}

function resolveAuthError(error: unknown, isRegister: boolean, appStrings: typeof strings.value) {
  if (error instanceof TypeError) return appStrings.networkError

  if (error instanceof ApiError) {
    const payload = error.payload as { error?: { code?: string } }
    const code = payload?.error?.code
    const message = error.message.toLowerCase()
    if (!isRegister && (code === 'invalid_credentials' || error.status === 401)) return appStrings.invalidCredentials
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

function togglePassword() { showPassword.value = !showPassword.value }
</script>

<template>
  <div class="page-shell auth-page-shell">
    <div class="auth-screen">
      <div class="auth-logo-mark" aria-hidden="true">◐</div>
      <h1 class="auth-title">{{ strings.loginTitle }}</h1>
      <p class="auth-subtitle">{{ strings.loginSubtitle }}</p>

      <div class="auth-field">
        <label class="auth-field__label" for="login-username">{{ strings.usernameLabel }}</label>
        <div class="auth-input-wrap">
          <span class="auth-input__icon" aria-hidden="true">
            <Icon name="users" :size="18" />
          </span>
          <input
            id="login-username"
            v-model="form.username"
            class="auth-input auth-input--with-icon"
            type="text"
            autocomplete="username"
            :disabled="isSubmitting"
          />
        </div>
      </div>

      <div class="auth-field">
        <label class="auth-field__label" for="login-password">{{ strings.passwordLabel }}</label>
        <div class="auth-input-wrap">
          <span class="auth-input__icon" aria-hidden="true">
            <Icon name="lock" :size="18" />
          </span>
          <input
            id="login-password"
            v-model="form.password"
            class="auth-input auth-input--with-icon auth-input--with-trailing"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            :disabled="isSubmitting"
          />
          <button
            class="auth-input__trailing"
            type="button"
            :title="showPassword ? strings.hidePasswordLabel : strings.showPasswordLabel"
            :aria-label="showPassword ? strings.hidePasswordLabel : strings.showPasswordLabel"
            :disabled="isSubmitting"
            @click="togglePassword"
          >
            <Icon name="eye" :size="18" />
          </button>
        </div>
      </div>

      <Transition name="auth-error-transition">
        <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
          <strong>{{ strings.authErrorTitle }}</strong>
          <span>{{ errorMessage }}</span>
        </div>
      </Transition>

      <button class="auth-cta" type="button" :disabled="isSubmitting" @click="submit">
        <span v-if="isSubmitting" class="button-loader" aria-hidden="true"></span>
        {{ isSubmitting ? loadingLabel : strings.loginAction }}
      </button>

      <RouterLink to="/auth/forgot-password" class="auth-link--inline" style="align-self: center;">
        {{ strings.forgotPasswordAction }}
      </RouterLink>

      <div class="auth-spacer"></div>
      <div class="auth-meta-row">
        <span>{{ strings.authSwitchToRegisterPrompt }}</span>
        <RouterLink to="/auth/register" class="auth-meta-row__link">{{ strings.authSwitchToRegisterCta }}</RouterLink>
      </div>
    </div>
  </div>
</template>
