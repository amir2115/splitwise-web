<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useSettingsStore } from '@/shared/stores/settings'
import { digitsOnly, formatAmountInput } from '@/shared/utils/format'
import {
  evaluateCalculatorExpression,
  formatCalculatorDisplayValue,
  formatCalculatorExpressionInput,
  normalizeExpression,
} from '@/shared/utils/calculator'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    disabled?: boolean
    mode?: 'amount' | 'percent'
  }>(),
  {
    disabled: false,
    mode: 'amount',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const settingsStore = useSettingsStore()
const expression = ref('')
const calculatorOpen = ref(false)
const errorMessage = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const isFa = computed(() => settingsStore.language === 'fa')
const inputMode = computed(() => (props.mode === 'percent' ? 'decimal' : 'numeric'))
const formattedValue = computed(() => formatAmountInput(props.modelValue, settingsStore.language))
const formattedExpression = computed(() => formatCalculatorExpressionInput(expression.value))
const displayValue = computed(() => {
  const formatted = formatCalculatorDisplayValue(expression.value)
  if (formatted !== null && formatted !== undefined) return formatted
  if (expression.value) return expression.value
  return '0'
})

watch(
  () => props.modelValue,
  (value) => {
    if (!calculatorOpen.value) expression.value = digitsOnly(value)
  },
  { immediate: true },
)

function countDigits(value: string) {
  return digitsOnly(value).length
}

function selectionIndexForDigitCount(value: string, digitCount: number) {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let index = 0; index < value.length; index += 1) {
    if (/\d|[۰-۹]|[٠-٩]/.test(value[index] ?? '')) {
      seen += 1
      if (seen >= digitCount) return index + 1
    }
  }
  return value.length
}

function countExpressionChars(value: string) {
  return normalizeExpression(value).length
}

function selectionIndexForExpressionCharCount(value: string, charCount: number) {
  if (charCount <= 0) return 0
  let seen = 0
  for (let index = 0; index < value.length; index += 1) {
    if (/[0-9+\-*/()]/.test(value[index] ?? '')) {
      seen += 1
      if (seen >= charCount) return index + 1
    }
  }
  return value.length
}

function updateInput(event: Event) {
  const element = event.target as HTMLInputElement
  const rawValue = element.value
  const digitsBeforeCaret = countDigits(rawValue.slice(0, element.selectionStart ?? rawValue.length))
  const normalized = digitsOnly(rawValue)

  emit('update:modelValue', normalized)

  nextTick(() => {
    const nextValue = formatAmountInput(normalized, settingsStore.language)
    const nextCaret = selectionIndexForDigitCount(nextValue, digitsBeforeCaret)
    inputRef.value?.setSelectionRange(nextCaret, nextCaret)
  })
}

function openCalculator() {
  expression.value = digitsOnly(props.modelValue)
  errorMessage.value = ''
  calculatorOpen.value = true
}

function closeCalculator() {
  calculatorOpen.value = false
  errorMessage.value = ''
}

function handleToken(token: string) {
  errorMessage.value = ''
  if (token === 'C') {
    expression.value = ''
    return
  }
  if (token === '⌫') {
    expression.value = expression.value.slice(0, -1)
    return
  }
  if (token === '=') {
    applyExpression()
    return
  }
  expression.value = normalizeExpression(`${expression.value}${token}`)
}

function updateExpressionInput(event: Event) {
  const element = event.target as HTMLInputElement
  const rawValue = element.value
  const expressionCharsBeforeCaret = countExpressionChars(rawValue.slice(0, element.selectionStart ?? rawValue.length))

  expression.value = normalizeExpression(rawValue)
  errorMessage.value = ''

  nextTick(() => {
    const nextCaret = selectionIndexForExpressionCharCount(formattedExpression.value, expressionCharsBeforeCaret)
    element.setSelectionRange(nextCaret, nextCaret)
  })
}

function applyExpression() {
  const result = evaluateCalculatorExpression(expression.value)
  if (result === null) {
    errorMessage.value = isFa.value ? 'عبارت ماشین‌حساب معتبر نیست.' : 'The calculator expression is invalid.'
    return
  }
  expression.value = String(result)
}

function confirmCalculator() {
  const normalized = normalizeExpression(expression.value)
  if (!normalized) {
    emit('update:modelValue', '')
    closeCalculator()
    return
  }

  const result = evaluateCalculatorExpression(normalized)
  if (result === null) {
    if (!/^\d+$/.test(normalized)) {
      errorMessage.value = isFa.value ? 'عبارت ماشین‌حساب معتبر نیست.' : 'The calculator expression is invalid.'
      return
    }
    emit('update:modelValue', digitsOnly(normalized))
    closeCalculator()
    return
  }

  emit('update:modelValue', String(result))
  closeCalculator()
}

const calculatorRows = [
  ['C', '(', ')', '⌫'],
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '00', '=', '+'],
]
</script>

<template>
  <div class="form-field amount-field">
    <label class="form-field__label">{{ label }}</label>
    <div class="amount-field__input-shell">
      <input
        ref="inputRef"
        :value="formattedValue"
        class="text-input amount-field__input"
        dir="ltr"
        :inputmode="inputMode"
        :disabled="disabled"
        @input="updateInput"
      />
      <button class="amount-field__icon-button" type="button" :disabled="disabled" @click="openCalculator">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4.5" y="3.5" width="15" height="17" rx="3" />
          <line x1="7.5" y1="8" x2="16.5" y2="8" />
          <rect x="7.5" y="10.5" width="2.5" height="2.5" rx="0.6" />
          <rect x="11" y="10.5" width="2.5" height="2.5" rx="0.6" />
          <rect x="14.5" y="10.5" width="2.5" height="2.5" rx="0.6" />
          <rect x="7.5" y="14" width="2.5" height="2.5" rx="0.6" />
          <rect x="11" y="14" width="2.5" height="2.5" rx="0.6" />
          <rect x="14.5" y="14" width="2.5" height="2.5" rx="0.6" />
        </svg>
      </button>
    </div>
  </div>

  <Teleport to="body">
    <transition name="bottom-sheet-fade">
      <div v-if="calculatorOpen" class="bottom-sheet-backdrop" @click.self="closeCalculator">
        <transition name="bottom-sheet-rise">
          <div class="calculator-sheet" role="dialog" aria-modal="true">
            <div class="calculator-sheet__header">
              <strong>{{ isFa ? 'ماشین‌حساب' : 'Calculator' }}</strong>
              <button class="icon-button calculator-sheet__close" type="button" @click="closeCalculator">✕</button>
            </div>

            <div class="calculator-display-card">
              <div class="calculator-display-card__label">{{ isFa ? 'عبارت' : 'Expression' }}</div>
              <div class="calculator-display-card__value">{{ displayValue }}</div>
              <div class="calculator-display-card__expression">{{ displayValue !== expression && expression ? expression : '' }}</div>
            </div>

            <div class="form-field">
              <label class="form-field__label">{{ isFa ? 'عبارت' : 'Expression' }}</label>
              <input
                :value="formattedExpression"
                class="text-input calculator-expression-input"
                dir="ltr"
                @input="updateExpressionInput"
              />
            </div>

            <div v-for="(row, rowIndex) in calculatorRows" :key="rowIndex" class="calculator-key-row">
              <button
                v-for="token in row"
                :key="token"
                class="outline-button calculator-key"
                type="button"
                @click="handleToken(token)"
              >
                {{ token }}
              </button>
            </div>

            <div v-if="errorMessage" class="auth-alert auth-alert--error" role="alert">
              <strong>{{ isFa ? 'خطا' : 'Error' }}</strong>
              <span>{{ errorMessage }}</span>
            </div>

            <div class="modal-actions calculator-sheet__actions">
              <button class="outline-button" type="button" style="flex: 1;" @click="closeCalculator">
                {{ isFa ? 'انصراف' : 'Cancel' }}
              </button>
              <button class="filled-button" type="button" style="flex: 1; height: 52px;" @click="confirmCalculator">
                {{ isFa ? 'استفاده از مقدار' : 'Use value' }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.amount-field {
  gap: 8px;
}

.amount-field__input-shell {
  position: relative;
}

.amount-field__input {
  direction: ltr;
  text-align: start;
  padding-left: 70px;
  padding-right: 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.amount-field__icon-button {
  position: absolute;
  inset-block-start: 50%;
  left: 10px;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 14px;
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface));
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

@media (max-width: 640px) {
  .amount-field__input {
    font-size: 18px;
    line-height: 1.45;
  }
}

.amount-field__icon-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.amount-field__icon-button svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bottom-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 16, 18, 0.42);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 80;
  padding-top: 24px;
}

.calculator-sheet {
  width: min(100%, 560px);
  max-height: min(88vh, 760px);
  overflow-y: auto;
  border-radius: 32px 32px 0 0;
  background: var(--color-surface);
  color: var(--color-on-surface);
  padding: 16px 18px calc(18px + env(safe-area-inset-bottom));
  box-shadow: 0 -18px 48px rgba(10, 16, 18, 0.18);
}

.calculator-sheet__header {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.calculator-sheet__header strong {
  font-size: 22px;
  line-height: 30px;
}

.calculator-sheet__close {
  flex-shrink: 0;
}

.calculator-display-card {
  border-radius: 28px;
  padding: 18px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-primary) 18%, var(--color-surface)),
      color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-accent)),
      color-mix(in srgb, var(--color-surface-variant) 24%, var(--color-surface))
    );
  display: flex;
  flex-direction: column;
  gap: 8px;
  direction: ltr;
  text-align: end;
  margin-bottom: 14px;
}

.calculator-display-card__label,
.calculator-display-card__expression {
  color: var(--color-on-surface-variant);
}

.calculator-display-card__value {
  font-size: 34px;
  font-weight: 800;
  line-height: 1.15;
}

.calculator-expression-input {
  direction: ltr;
  text-align: start;
  margin-bottom: 14px;
}

.calculator-key-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.calculator-key {
  min-height: 52px;
  border-radius: 18px;
}

.calculator-sheet__actions {
  margin-top: 16px;
}

.bottom-sheet-fade-enter-active,
.bottom-sheet-fade-leave-active,
.bottom-sheet-rise-enter-active,
.bottom-sheet-rise-leave-active {
  transition: all 180ms ease;
}

.bottom-sheet-fade-enter-from,
.bottom-sheet-fade-leave-to {
  opacity: 0;
}

.bottom-sheet-rise-enter-from,
.bottom-sheet-rise-leave-to {
  transform: translateY(24px);
  opacity: 0;
}
</style>
