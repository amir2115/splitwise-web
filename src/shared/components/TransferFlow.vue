<script setup lang="ts">
withDefaults(defineProps<{
  from: string
  to: string
  fromCaption?: string
  toCaption?: string
  prefixAt?: boolean
  stacked?: boolean
}>(), {
  fromCaption: '',
  toCaption: '',
  prefixAt: false,
  stacked: false,
})
</script>

<template>
  <div class="transfer-flow" :class="{ 'transfer-flow--stacked': stacked }">
    <div class="transfer-flow__party">
      <strong class="transfer-flow__name">
        <span v-if="prefixAt" class="transfer-flow__prefix">@</span>
        <span class="transfer-flow__value">{{ from }}</span>
      </strong>
      <span v-if="fromCaption" class="muted transfer-flow__caption">{{ fromCaption }}</span>
    </div>

    <span class="transfer-flow__arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M5 12h14" />
        <path d="m13 7 6 5-6 5" />
      </svg>
    </span>

    <div class="transfer-flow__party">
      <strong class="transfer-flow__name">
        <span v-if="prefixAt" class="transfer-flow__prefix">@</span>
        <span class="transfer-flow__value">{{ to }}</span>
      </strong>
      <span v-if="toCaption" class="muted transfer-flow__caption">{{ toCaption }}</span>
    </div>
  </div>
</template>

<style scoped>
.transfer-flow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  direction: ltr;
  unicode-bidi: isolate;
}

.transfer-flow--stacked {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  width: 100%;
  gap: 14px;
}

.transfer-flow__party {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
}

.transfer-flow__name {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  direction: ltr;
  unicode-bidi: isolate;
}

.transfer-flow__prefix,
.transfer-flow__value {
  direction: ltr;
  unicode-bidi: isolate;
}

.transfer-flow__arrow {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  direction: ltr;
  unicode-bidi: isolate;
}

.transfer-flow__arrow svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
