<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Icon from '@/shared/components/Icon.vue'
import { useSettingsStore } from '@/shared/stores/settings'
import { digitsOnly, formatAmountInput } from '@/shared/utils/format'
import {
  evaluateCalculatorExpression,
  formatCalculatorDisplayValue,
  formatCalculatorExpressionInput,
  normalizeExpression,
} from '@/shared/utils/calculator'

type Variant = 'sm' | 'md' | 'lg' | 'display'

const props = withDefaults(
  defineProps<{
    modelValue: string
    variant?: Variant
    placeholder?: string
    suffix?: string
    mode?: 'amount' | 'percent'
    disabled?: boolean
    /** Show the inline clear (×) button when a value is present. Default true. */
    clearable?: boolean
    /** Show the calculator (=) icon button. Default true. */
    withCalc?: boolean
    /** Optional aria label. */
    ariaLabel?: string
    /** When true, align text to end (used by table-style rows). */
    alignEnd?: boolean
    /** Optional bordered visual; default true. Set false for "naked" inputs (e.g. share rows). */
    bordered?: boolean
  }>(),
  {
    variant: 'md',
    placeholder: '',
    suffix: '',
    mode: 'amount',
    disabled: false,
    clearable: true,
    withCalc: true,
    ariaLabel: '',
    alignEnd: false,
    bordered: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const settingsStore = useSettingsStore()
const inputRef = ref<HTMLInputElement | null>(null)
const expressionInputRef = ref<HTMLInputElement | null>(null)

const calculatorOpen = ref(false)
const expression = ref('')
const errorMessage = ref('')

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

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', digitsOnly(value))
}

function clearValue() {
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

function openCalculator() {
  expression.value = digitsOnly(props.modelValue)
  errorMessage.value = ''
  calculatorOpen.value = true
  nextTick(() => focusExpressionInput(expression.value.length))
}

function closeCalculator() {
  calculatorOpen.value = false
  errorMessage.value = ''
}

/** Count expression chars (digits + operators + parens) ignoring formatting separators. */
function countExpressionChars(value: string) {
  return normalizeExpression(value).length
}

/** Given a formatted expression and a raw-char count, return the corresponding caret index in the formatted string. */
function selectionIndexForExpressionCharCount(value: string, charCount: number) {
  if (charCount <= 0) return 0
  let seen = 0
  for (let i = 0; i < value.length; i += 1) {
    if (/[0-9+\-*/()]/.test(value[i] ?? '')) {
      seen += 1
      if (seen >= charCount) return i + 1
    }
  }
  return value.length
}

function currentExpressionSelection() {
  const el = expressionInputRef.value
  const value = formattedExpression.value
  if (!el) return { start: countExpressionChars(value), end: countExpressionChars(value) }
  const start = countExpressionChars(value.slice(0, el.selectionStart ?? value.length))
  const end = countExpressionChars(value.slice(0, el.selectionEnd ?? value.length))
  return { start, end }
}

function focusExpressionInput(charCount = countExpressionChars(expression.value)) {
  nextTick(() => {
    const el = expressionInputRef.value
    if (!el) return
    const idx = selectionIndexForExpressionCharCount(formattedExpression.value, charCount)
    el.focus({ preventScroll: true })
    el.setSelectionRange(idx, idx)
  })
}

function handleToken(token: string) {
  errorMessage.value = ''
  if (token === 'C') {
    expression.value = ''
    focusExpressionInput(0)
    return
  }
  if (token === '=') {
    applyExpression()
    return
  }

  const normalized = normalizeExpression(expression.value)
  const { start, end } = currentExpressionSelection()

  if (token === '⌫') {
    // If user has a selection, delete it. Otherwise delete the char before caret.
    if (start !== end) {
      expression.value = `${normalized.slice(0, start)}${normalized.slice(end)}`
      focusExpressionInput(start)
      return
    }
    if (start <= 0) {
      focusExpressionInput(0)
      return
    }
    expression.value = `${normalized.slice(0, start - 1)}${normalized.slice(start)}`
    focusExpressionInput(start - 1)
    return
  }

  // Insert at caret (replacing any selection range).
  expression.value = `${normalized.slice(0, start)}${token}${normalized.slice(end)}`
  focusExpressionInput(start + token.length)
}

function onExpressionInput(event: Event) {
  const el = event.target as HTMLInputElement
  const raw = el.value
  // Track caret position in raw-char units BEFORE we re-normalize/format the value.
  const startChars = countExpressionChars(raw.slice(0, el.selectionStart ?? raw.length))
  const endChars = countExpressionChars(raw.slice(0, el.selectionEnd ?? raw.length))
  expression.value = normalizeExpression(raw)
  errorMessage.value = ''
  // Restore caret position based on raw-char count.
  nextTick(() => {
    const node = expressionInputRef.value
    if (!node) return
    const formatted = formattedExpression.value
    const startIdx = selectionIndexForExpressionCharCount(formatted, startChars)
    const endIdx = selectionIndexForExpressionCharCount(formatted, endChars)
    node.setSelectionRange(startIdx, endIdx)
  })
}

function applyExpression() {
  const result = evaluateCalculatorExpression(expression.value)
  if (result === null) {
    errorMessage.value = isFa.value ? 'عبارت ماشین‌حساب معتبر نیست.' : 'The calculator expression is invalid.'
    nextTick(() => focusExpressionInput())
    return
  }
  expression.value = String(result)
  nextTick(() => focusExpressionInput(expression.value.length))
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
  <div class="amount-field" :class="[`amount-field--${variant}`, { 'is-bordered': bordered, 'is-end': alignEnd, 'has-suffix': suffix }]">
    <input
      ref="inputRef"
      :value="formattedValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :inputmode="inputMode"
      :aria-label="ariaLabel"
      class="amount-field__input num"
      dir="ltr"
      @input="onInput"
    />
    <span v-if="suffix" class="amount-field__suffix">{{ suffix }}</span>
    <button
      v-if="clearable && modelValue && !disabled"
      type="button"
      class="amount-field__btn amount-field__btn--clear"
      :aria-label="isFa ? 'پاک کردن' : 'Clear'"
      @click="clearValue"
    >
      <Icon name="close" :size="14" />
    </button>
    <button
      v-if="withCalc"
      type="button"
      class="amount-field__btn amount-field__btn--calc"
      :disabled="disabled"
      :aria-label="isFa ? 'ماشین‌حساب' : 'Calculator'"
      @mousedown.prevent
      @click="openCalculator"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6">
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

  <Teleport to="body">
    <Transition name="amount-sheet-fade">
      <div v-if="calculatorOpen" class="amount-sheet-backdrop" @click.self="closeCalculator">
        <Transition name="amount-sheet-rise">
          <div class="amount-sheet" role="dialog" aria-modal="true">
            <div class="amount-sheet__header">
              <strong>{{ isFa ? 'ماشین‌حساب' : 'Calculator' }}</strong>
              <button class="icon-button" type="button" :aria-label="isFa ? 'بستن' : 'Close'" @click="closeCalculator">
                <Icon name="close" :size="14" />
              </button>
            </div>
            <div class="amount-sheet__display">
              <div class="amount-sheet__display-label">{{ isFa ? 'عبارت' : 'Expression' }}</div>
              <bdi class="amount-sheet__display-value num">{{ displayValue }}</bdi>
              <bdi v-if="expression && displayValue !== formattedExpression" class="amount-sheet__display-expr num">{{ formattedExpression }}</bdi>
            </div>
            <input
              ref="expressionInputRef"
              :value="formattedExpression"
              dir="ltr"
              autocapitalize="off"
              autocomplete="off"
              spellcheck="false"
              class="amount-sheet__expr-input num"
              @input="onExpressionInput"
            />
            <div class="amount-sheet__keys" dir="ltr">
              <div v-for="(row, ri) in calculatorRows" :key="ri" class="amount-sheet__key-row">
                <button
                  v-for="token in row"
                  :key="token"
                  type="button"
                  class="amount-sheet__key"
                  :class="{ 'is-op': /[+\-*/()=]/.test(token), 'is-clear': token === 'C' }"
                  @mousedown.prevent
                  @click="handleToken(token)"
                >{{ token }}</button>
              </div>
            </div>
            <div v-if="errorMessage" class="amount-sheet__error">{{ errorMessage }}</div>
            <div class="amount-sheet__actions">
              <button class="outline-button" type="button" @click="closeCalculator">{{ isFa ? 'انصراف' : 'Cancel' }}</button>
              <button class="filled-button" type="button" @click="confirmCalculator">{{ isFa ? 'استفاده از مقدار' : 'Use value' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ============ Field shell ============ */
.amount-field {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  width: 100%;
  position: relative;
  min-width: 0;
}
.amount-field.is-bordered {
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: var(--s-2) var(--s-3);
  transition: border-color var(--d-fast) var(--ease-standard), box-shadow var(--d-fast) var(--ease-standard);
}
.amount-field.is-bordered:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--ring);
}

/* Input */
.amount-field__input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  text-align: start;
  padding: 0;
}
.amount-field.is-end .amount-field__input { text-align: end; }
.amount-field__input::placeholder { color: var(--fg-subtle); }

/* Suffix label (e.g. تومان, %) */
.amount-field__suffix {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--fg-muted);
  white-space: nowrap;
}

/* Buttons */
.amount-field__btn {
  flex-shrink: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  color: var(--fg-subtle);
  transition: background var(--d-fast) var(--ease-standard), color var(--d-fast) var(--ease-standard);
  padding: 0;
}
.amount-field__btn:hover { background: var(--hover); color: var(--brand); }
.amount-field__btn--clear { color: var(--fg-subtle); }
.amount-field__btn--calc { color: var(--brand); }
.amount-field__btn:disabled { opacity: 0.5; cursor: default; }

/* Sizes */
.amount-field--sm {
  min-height: 36px;
}
.amount-field--sm .amount-field__input { font-size: var(--t-label); font-weight: var(--fw-medium); }
.amount-field--sm .amount-field__btn { width: 24px; height: 24px; }
.amount-field--sm .amount-field__btn svg { width: 14px; height: 14px; }

.amount-field--md {
  min-height: 44px;
}
.amount-field--md .amount-field__input { font-size: var(--t-body); font-weight: var(--fw-semibold); }
.amount-field--md .amount-field__btn { width: 28px; height: 28px; }
.amount-field--md .amount-field__btn svg { width: 16px; height: 16px; }

.amount-field--lg {
  min-height: 56px;
}
.amount-field--lg .amount-field__input { font-size: var(--t-h2); font-weight: var(--fw-semibold); }
.amount-field--lg .amount-field__btn { width: 32px; height: 32px; }
.amount-field--lg .amount-field__btn svg { width: 18px; height: 18px; }

/* Display: huge, transparent. The whole row inherits the document direction so on RTL
   pages the calculator icon and currency suffix appear on the LEFT and the input field
   on the RIGHT (mirrored on LTR pages). Numbers themselves stay LTR via the input's
   dir="ltr" attribute. Typing fills from the side closest to the suffix outward. */
.amount-field--display {
  background: transparent !important;
  border: 0 !important;
  padding: 0 !important;
  display: flex;
  flex-wrap: nowrap;
  align-items: baseline;
  gap: var(--s-3);
}
.amount-field--display .amount-field__input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  font-size: 52px;
  font-weight: var(--fw-bold);
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--brand);
  min-height: 56px;
  /* Anchor digits to the input's start edge in both directions:
     - LTR: input sits on the left; digits start at the left, the suffix is on the right.
     - RTL: input sits on the right; the suffix is on the LEFT of the input, so digits
            still anchored to the left edge appear right next to "تومان". */
  text-align: left;
}
.amount-field--display .amount-field__input::placeholder { color: color-mix(in srgb, var(--brand) 24%, transparent); }
.amount-field--display .amount-field__suffix {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: var(--fw-medium);
}
/* Display variant: no clear button (the calc icon is enough) */
.amount-field--display .amount-field__btn--clear { display: none; }
.amount-field--display .amount-field__btn--calc {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  background: var(--brand-soft);
  color: var(--brand);
  border-radius: var(--r-md);
  align-self: center;
}
.amount-field--display .amount-field__btn--calc svg { width: 20px; height: 20px; }
.amount-field--display .amount-field__btn--calc:hover {
  background: color-mix(in srgb, var(--brand) 22%, transparent);
}
/* Display variant is meant to feel "naked" — it has no border to begin with,
   so the focus-within ring inherited from .is-bordered must be suppressed. */
.amount-field--display.is-bordered,
.amount-field--display.is-bordered:focus-within {
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}

/* ============ Calculator sheet ============ */
.amount-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-top: 24px;
}
.amount-sheet {
  width: 100%;
  max-width: 560px;
  max-height: 92vh;
  background: var(--surface);
  border-top-left-radius: var(--r-2xl);
  border-top-right-radius: var(--r-2xl);
  padding: var(--s-5) var(--s-6) calc(var(--s-6) + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  overflow-y: auto;
  box-shadow: var(--shadow-3);
}
.amount-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.amount-sheet__header strong {
  font-size: var(--t-h2);
  font-weight: var(--fw-semibold);
}
.amount-sheet__display {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  padding: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--brand-soft);
  text-align: end;
  direction: ltr;
  unicode-bidi: isolate;
}
.amount-sheet__display-label {
  font-size: var(--t-caption);
  color: var(--fg-muted);
  align-self: flex-end;
}
.amount-sheet__display-value {
  font-size: 32px;
  font-weight: var(--fw-bold);
  color: var(--brand);
  letter-spacing: -0.02em;
  direction: ltr;
  unicode-bidi: isolate;
  align-self: flex-end;
}
.amount-sheet__display-expr {
  font-size: var(--t-caption);
  color: var(--fg-muted);
  direction: ltr;
  unicode-bidi: isolate;
  align-self: flex-end;
}
.amount-sheet__expr-input {
  width: 100%;
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-md);
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--fg);
  font-size: var(--t-body);
  outline: none;
  direction: ltr;
  unicode-bidi: isolate;
  text-align: left;
}
.amount-sheet__expr-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--ring);
}
.amount-sheet__keys {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  /* Force LTR so digits stay [7][8][9][/] left-to-right and operators land on the right
     in any language. */
  direction: ltr;
  unicode-bidi: isolate;
}
.amount-sheet__key-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-2);
  direction: ltr;
}
.amount-sheet__key {
  min-height: 48px;
  border-radius: var(--r-md);
  background: var(--surface-sunk);
  color: var(--fg);
  border: 1px solid var(--border);
  font-size: var(--t-h2);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard), transform var(--d-instant) var(--ease-standard);
}
.amount-sheet__key:active { transform: scale(0.97); }
.amount-sheet__key:hover { background: var(--hover); }
.amount-sheet__key.is-op { color: var(--brand); font-weight: var(--fw-bold); }
.amount-sheet__key.is-clear { color: var(--neg); }
.amount-sheet__error {
  background: var(--neg-soft);
  color: var(--neg);
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-md);
  font-size: var(--t-label);
}
.amount-sheet__actions {
  display: flex;
  gap: var(--s-3);
  margin-top: var(--s-2);
}
.amount-sheet__actions > * { flex: 1; }

/* ============ Transitions ============ */
.amount-sheet-fade-enter-active, .amount-sheet-fade-leave-active {
  transition: opacity var(--d-base) var(--ease-standard);
}
.amount-sheet-fade-enter-from, .amount-sheet-fade-leave-to { opacity: 0; }
.amount-sheet-rise-enter-active, .amount-sheet-rise-leave-active {
  transition: transform var(--d-slow) var(--ease-emphasized), opacity var(--d-base) var(--ease-standard);
}
.amount-sheet-rise-enter-from, .amount-sheet-rise-leave-to {
  transform: translateY(36px);
  opacity: 0;
}
</style>
