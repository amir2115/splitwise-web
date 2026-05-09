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

const { strings, language } = storeToRefs(settingsStore)
const { isSubmitting } = storeToRefs(authStore)

const form = reactive({
  name: '',
  username: '',
  password: '',
})

const errorMessage = ref('')
const showPassword = ref(false)
const loadingLabel = computed(() => strings.value.registerLoading)
const isRtl = computed(() => language.value === 'fa')

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

function togglePassword() { showPassword.value = !showPassword.value }
</script>

<template>
  <div class="page-shell auth-page-shell">
    <div class="auth-screen">
      <div class="auth-title-row">
        <h1 class="auth-title">{{ strings.registerTitle }}</h1>
        <span class="auth-step-pill">
          <span class="auth-step-pill__dot"></span>
          <span>{{ isRtl ? 'مرحله ۱ از ۲' : 'Step 1 of 2' }}</span>
        </span>
      </div>
      <p class="auth-subtitle">{{ strings.registerSubtitle }}</p>

      <div class="auth-field">
        <label class="auth-field__label" for="register-name">{{ strings.nameLabel }}</label>
        <div class="auth-input-wrap">
          <span class="auth-input__icon" aria-hidden="true">
            <Icon name="users" :size="18" />
          </span>
          <input
            id="register-name"
            v-model="form.name"
            class="auth-input auth-input--with-icon"
            type="text"
            autocomplete="name"
            :disabled="isSubmitting"
          />
        </div>
      </div>

      <div class="auth-field">
        <label class="auth-field__label" for="register-username">{{ strings.usernameLabel }}</label>
        <div class="auth-input-wrap">
          <span class="auth-input__icon" aria-hidden="true">
            <Icon name="user-plus" :size="18" />
          </span>
          <input
            id="register-username"
            v-model="form.username"
            class="auth-input auth-input--with-icon"
            type="text"
            autocomplete="username"
            :disabled="isSubmitting"
          />
        </div>
      </div>

      <div class="auth-field">
        <label class="auth-field__label" for="register-password">{{ strings.passwordLabel }}</label>
        <div class="auth-input-wrap">
          <span class="auth-input__icon" aria-hidden="true">
            <Icon name="lock" :size="18" />
          </span>
          <input
            id="register-password"
            v-model="form.password"
            class="auth-input auth-input--with-icon auth-input--with-trailing"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
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
        <span>{{ isSubmitting ? loadingLabel : strings.registerAction }}</span>
        <Icon v-if="!isSubmitting" :name="isRtl ? 'arrow-left' : 'arrow-right'" :size="18" />
      </button>

      <div class="auth-spacer"></div>
      <div class="auth-meta-row">
        <span>{{ strings.authSwitchToLoginPrompt }}</span>
        <RouterLink to="/auth/login" class="auth-meta-row__link">{{ strings.authSwitchToLoginCta }}</RouterLink>
      </div>
    </div>
  </div>
</template>
