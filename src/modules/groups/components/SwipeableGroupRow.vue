<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Avatar from '@/shared/components/Avatar.vue'
import Icon from '@/shared/components/Icon.vue'
import { useSettingsStore } from '@/shared/stores/settings'
import { storeToRefs } from 'pinia'

type Tone = 'brand' | 'accent' | 'settled'
type Direction = 'receive' | 'owe' | 'settled' | 'unknown'

const props = withDefaults(
  defineProps<{
    name: string
    subtitle: string
    direction?: Direction
    amount?: number | null
    receiveLabel: string
    oweLabel: string
    settledLabel: string
    editLabel: string
    deleteLabel: string
    openId: string | null
    rowId: string
    isLoadingBalance?: boolean
  }>(),
  {
    direction: 'unknown',
    amount: null,
    isLoadingBalance: false,
  },
)

const emit = defineEmits<{
  open: []
  edit: []
  remove: []
  longPress: []
  swipeStateChange: [rowId: string | null]
}>()

const settingsStore = useSettingsStore()
const { language } = storeToRefs(settingsStore)
const isRtl = computed(() => language.value === 'fa')

// Single-action width
const ACTION_WIDTH = 84
// Snap-open threshold
const SNAP_OPEN = 28
// Auto-trigger threshold (must exceed action width meaningfully)
const AUTO_TRIGGER = 110
// Long-press
const LONG_PRESS_MS = 480
const MOVE_TOLERANCE = 6

const translateX = ref(0)
const isDragging = ref(false)
const isOpen = ref(false)
const willTrigger = ref(false)
const surfaceEl = ref<HTMLElement | null>(null)
const rootEl = ref<HTMLElement | null>(null)

let startX = 0
let startY = 0
let pointerId: number | null = null
let lockedAxis: 'x' | 'y' | null = null
let longPressTimer: number | null = null
let didLongPress = false
let firingAction = false

const amountFormatted = computed(() => {
  if (props.amount == null) return null
  const value = Math.abs(props.amount)
  return new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-US').format(value)
})

const directionTone = computed<Tone>(() => {
  if (props.direction === 'receive') return 'brand'
  if (props.direction === 'owe') return 'accent'
  return 'settled'
})

const isMeaningful = computed(
  () => props.direction === 'receive' || props.direction === 'owe' || props.direction === 'settled',
)

// Physical sides:
// - LEFT cluster reveals when surface dragged RIGHT (translateX > 0). Action: edit.
// - RIGHT cluster reveals when surface dragged LEFT (translateX < 0). Action: delete.
const leftClusterWidth = computed(() => Math.max(0, translateX.value))
const rightClusterWidth = computed(() => Math.max(0, -translateX.value))

watch(
  () => props.openId,
  (newId) => {
    if (newId !== props.rowId && isOpen.value) {
      closeSwipe()
    }
  },
)

function clearLongPressTimer() {
  if (longPressTimer !== null) {
    window.clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function tryHaptic(strong = false) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(strong ? 18 : 10)
    } catch {
      // ignore
    }
  }
}

function applyTransform(value: number, mode: 'instant' | 'snap' | 'spring' = 'instant') {
  translateX.value = value
  if (surfaceEl.value) {
    if (mode === 'spring') {
      surfaceEl.value.style.transition = 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1)'
    } else if (mode === 'snap') {
      surfaceEl.value.style.transition = 'transform 220ms cubic-bezier(0.2, 0, 0, 1)'
    } else {
      surfaceEl.value.style.transition = 'none'
    }
  }
}

function openSwipe(direction: 'left' | 'right') {
  const target = direction === 'left' ? -ACTION_WIDTH : ACTION_WIDTH
  applyTransform(target, 'snap')
  isOpen.value = true
  willTrigger.value = false
  emit('swipeStateChange', props.rowId)
}

function closeSwipe(animated = true) {
  applyTransform(0, animated ? 'spring' : 'instant')
  willTrigger.value = false
  if (isOpen.value) {
    isOpen.value = false
    emit('swipeStateChange', null)
  }
}

function fireAction(action: 'edit' | 'remove') {
  if (firingAction) return
  firingAction = true
  // Spring back, then emit
  applyTransform(0, 'spring')
  isOpen.value = false
  willTrigger.value = false
  emit('swipeStateChange', null)
  window.setTimeout(() => {
    firingAction = false
    if (action === 'edit') emit('edit')
    else emit('remove')
  }, 240)
}

function onPointerDown(event: PointerEvent) {
  if ((event.target as HTMLElement)?.closest('.swipe-row__action')) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (firingAction) return
  pointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY
  lockedAxis = null
  didLongPress = false
  isDragging.value = false

  // Capture early so move events keep coming even if pointer leaves the element
  try {
    surfaceEl.value?.setPointerCapture(event.pointerId)
  } catch {
    // ignore
  }

  if (!isOpen.value) {
    clearLongPressTimer()
    longPressTimer = window.setTimeout(() => {
      didLongPress = true
      tryHaptic(true)
      emit('longPress')
    }, LONG_PRESS_MS)
  }
}

function onPointerMove(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  const deltaX = event.clientX - startX
  const deltaY = event.clientY - startY

  if (lockedAxis === null) {
    if (Math.abs(deltaX) < MOVE_TOLERANCE && Math.abs(deltaY) < MOVE_TOLERANCE) return
    lockedAxis = Math.abs(deltaX) > Math.abs(deltaY) * 1.1 ? 'x' : 'y'
  }

  if (lockedAxis === 'y') {
    clearLongPressTimer()
    return
  }

  clearLongPressTimer()
  isDragging.value = true

  // Compute target translation
  let next = deltaX
  if (isOpen.value) {
    const opened = translateX.value > 0 ? ACTION_WIDTH : -ACTION_WIDTH
    next = opened + deltaX
  }

  // Soft clamp beyond ACTION_WIDTH (allow user to pull a bit further with resistance)
  const max = ACTION_WIDTH * 1.8
  if (next > max) next = max
  if (next < -max) next = -max

  applyTransform(next, 'instant')

  // Trigger feedback
  const crossed = Math.abs(next) >= AUTO_TRIGGER
  if (crossed && !willTrigger.value) {
    willTrigger.value = true
    tryHaptic()
  } else if (!crossed && willTrigger.value) {
    willTrigger.value = false
  }

  // Prevent default so the page doesn't scroll horizontally or select text
  if (event.cancelable) event.preventDefault()
}

function onPointerEnd(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  pointerId = null
  clearLongPressTimer()
  try {
    surfaceEl.value?.releasePointerCapture(event.pointerId)
  } catch {
    // ignore
  }

  // Tap → open detail
  if (lockedAxis !== 'x') {
    if (!didLongPress && !isDragging.value && !isOpen.value) {
      emit('open')
    }
    isDragging.value = false
    return
  }

  isDragging.value = false
  const tx = translateX.value
  const absTx = Math.abs(tx)

  if (absTx >= AUTO_TRIGGER) {
    // Auto-execute
    fireAction(tx > 0 ? 'edit' : 'remove')
  } else if (absTx > SNAP_OPEN) {
    openSwipe(tx < 0 ? 'left' : 'right')
  } else {
    closeSwipe()
  }
}

function onPointerCancel(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  pointerId = null
  clearLongPressTimer()
  isDragging.value = false
  if (!isOpen.value) closeSwipe()
}

function onActionClick(action: 'edit' | 'remove') {
  fireAction(action)
}

onBeforeUnmount(() => {
  clearLongPressTimer()
})

defineExpose({ closeSwipe })
</script>

<template>
  <div ref="rootEl" class="swipe-row" :class="{ 'is-open': isOpen, 'is-dragging': isDragging, 'will-trigger': willTrigger }">
    <!-- Background action layer -->
    <div class="swipe-row__bg" aria-hidden="true">
      <div class="swipe-row__cluster swipe-row__cluster--left" :style="{ width: leftClusterWidth + 'px' }">
        <button
          class="swipe-row__action swipe-row__action--edit"
          :class="{ 'is-trigger': willTrigger && translateX > 0 }"
          type="button"
          tabindex="-1"
          :aria-label="editLabel"
          @click.stop="onActionClick('edit')"
        >
          <Icon name="edit" :size="18" />
          <span>{{ editLabel }}</span>
        </button>
      </div>
      <div class="swipe-row__cluster swipe-row__cluster--right" :style="{ width: rightClusterWidth + 'px' }">
        <button
          class="swipe-row__action swipe-row__action--delete"
          :class="{ 'is-trigger': willTrigger && translateX < 0 }"
          type="button"
          tabindex="-1"
          :aria-label="deleteLabel"
          @click.stop="onActionClick('remove')"
        >
          <Icon name="trash" :size="18" />
          <span>{{ deleteLabel }}</span>
        </button>
      </div>
    </div>

    <!-- Foreground content -->
    <div
      ref="surfaceEl"
      class="swipe-row__surface"
      :style="{ transform: `translate3d(${translateX}px, 0, 0)` }"
      tabindex="0"
      role="button"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerCancel"
      @keydown.enter.prevent="emit('open')"
      @keydown.space.prevent="emit('open')"
    >
      <Avatar :name="name" :tone="directionTone" :size="40" />
      <div class="swipe-row__body">
        <strong class="swipe-row__title">{{ name }}</strong>
        <span class="swipe-row__sub">{{ subtitle }}</span>
      </div>

      <div class="swipe-row__amount">
        <template v-if="isLoadingBalance">
          <div class="swipe-row__amount-skeleton" />
        </template>
        <template v-else-if="direction === 'settled' || (isMeaningful && (amount ?? 0) === 0)">
          <span class="swipe-row__amount-status">{{ settledLabel }}</span>
        </template>
        <template v-else-if="direction === 'receive' && amountFormatted">
          <span class="num swipe-row__amount-value swipe-row__amount-value--pos">{{ amountFormatted }}</span>
          <span class="swipe-row__amount-status">{{ receiveLabel }}</span>
        </template>
        <template v-else-if="direction === 'owe' && amountFormatted">
          <span class="num swipe-row__amount-value swipe-row__amount-value--neg">{{ amountFormatted }}</span>
          <span class="swipe-row__amount-status">{{ oweLabel }}</span>
        </template>
        <template v-else>
          <Icon :name="isRtl ? 'chevron-left' : 'chevron-right'" :size="16" class="swipe-row__chevron" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.swipe-row {
  position: relative;
  border-bottom: 1px solid var(--divider);
  isolation: isolate;
  overflow: hidden;
}
.swipe-row:last-of-type { border-bottom: 0; }

/* Background layer with two physical-side clusters */
.swipe-row__bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.swipe-row__cluster {
  position: absolute;
  top: 0;
  bottom: 0;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  pointer-events: none;
}
.swipe-row__cluster > .swipe-row__action { pointer-events: auto; }

.swipe-row__cluster--left {
  left: 0;
  /* Anchor button to the RIGHT edge of the cluster (closest to surface) */
  justify-content: flex-end;
  background: var(--accent);
}
.swipe-row__cluster--right {
  right: 0;
  /* Anchor button to the LEFT edge of the cluster (closest to surface) */
  justify-content: flex-start;
  background: var(--neg);
}

.swipe-row__action {
  width: 84px;
  flex-shrink: 0;
  border: 0;
  background: transparent;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.01em;
  cursor: pointer;
  color: #fff;
  transition: transform var(--d-fast) var(--ease-standard);
}
.swipe-row__action svg { width: 18px; height: 18px; }
.swipe-row__action--edit { color: var(--accent-on); }
.swipe-row__action--delete { color: #ffffff; }

/* Trigger feedback */
.swipe-row__action.is-trigger {
  transform: scale(1.06);
}

.swipe-row__surface {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-3);
  /* Transparent — page bg (with gradient) shows through.
     Action clusters behind have width 0 when idle, so nothing leaks through. */
  background: transparent;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  outline: none;
  touch-action: pan-y;
  will-change: transform;
  transition: background var(--d-fast) var(--ease-standard);
}
/* When dragging or open, give the surface a solid bg so action clusters can't show through it */
.swipe-row.is-dragging .swipe-row__surface,
.swipe-row.is-open .swipe-row__surface {
  background: var(--bg);
}
.swipe-row__surface:focus-visible {
  box-shadow: inset 0 0 0 2px var(--ring);
  border-radius: var(--r-sm);
}
.swipe-row.is-dragging .swipe-row__surface { cursor: grabbing; }

.swipe-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.swipe-row__title {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.swipe-row__sub {
  font-size: var(--t-caption);
  color: var(--fg-muted);
}

.swipe-row__amount {
  display: flex;
  flex-direction: column;
  /* flex-end on cross-axis = physical end of inline direction
     LTR: physical right; RTL: physical left.
     Matches design where the amount sits at the row's trailing edge. */
  align-items: flex-end;
  gap: 2px;
  min-width: 60px;
  text-align: end;
}

.swipe-row__amount-value {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.01em;
}
.swipe-row__amount-value--pos { color: var(--pos); }
.swipe-row__amount-value--neg { color: var(--neg); }

.swipe-row__amount-status {
  font-size: 11px;
  color: var(--fg-subtle);
}

.swipe-row__chevron {
  width: 16px;
  height: 16px;
  color: var(--fg-subtle);
  opacity: 0.7;
}

.swipe-row__amount-skeleton {
  display: block;
  width: 64px;
  height: 14px;
  background: linear-gradient(90deg, var(--surface-sunk), var(--surface-2), var(--surface-sunk));
  background-size: 200% 100%;
  animation: row-shimmer 1.4s linear infinite;
  border-radius: var(--r-pill);
}
@keyframes row-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
</style>
