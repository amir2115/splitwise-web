<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    autocomplete?: string
    disabled?: boolean
    placeholder?: string
    showLabel?: string
    hideLabel?: string
  }>(),
  {
    autocomplete: 'current-password',
    disabled: false,
    placeholder: '',
    showLabel: 'Show password',
    hideLabel: 'Hide password',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isVisible = ref(false)

const inputType = computed(() => (isVisible.value ? 'text' : 'password'))
const toggleLabel = computed(() => (isVisible.value ? props.hideLabel : props.showLabel))

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function toggleVisibility() {
  isVisible.value = !isVisible.value
}
</script>

<template>
  <div class="password-field">
    <input
      :value="modelValue"
      class="text-input password-field__input"
      :type="inputType"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="onInput"
    />
    <button
      class="password-field__toggle"
      type="button"
      :aria-label="toggleLabel"
      :title="toggleLabel"
      :disabled="disabled"
      @click="toggleVisibility"
    >
      <svg
        v-if="isVisible"
        class="password-field__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <svg
        v-else
        class="password-field__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3l18 18" />
        <path d="M10.7 5.1A11.4 11.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-4 4.8" />
        <path d="M6.6 6.7C4 8.5 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4-.7" />
        <path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.password-field {
  position: relative;
  width: 100%;
}

.password-field__input {
  padding-inline-end: 52px;
}

.password-field__toggle {
  position: absolute;
  inset-inline-end: 12px;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: color-mix(in srgb, var(--color-on-surface) 72%, var(--color-outline));
  transform: translateY(-50%);
  cursor: pointer;
}

.password-field__toggle:disabled {
  cursor: default;
  opacity: 0.55;
}

.password-field__toggle:not(:disabled):hover {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

.password-field__icon {
  width: 18px;
  height: 18px;
}
</style>
