<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  sub?: string
  amount?: string
  amountTone?: 'pos' | 'neg' | 'settled' | 'default'
  interactive?: boolean
}>(), {
  sub: '',
  amount: '',
  amountTone: 'default',
  interactive: false,
})

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <component
    :is="interactive ? 'button' : 'div'"
    class="list-row"
    :class="{ 'list-row--interactive': interactive }"
    :type="interactive ? 'button' : undefined"
    @click="interactive && emit('click')"
  >
    <span class="list-row__icon"><slot name="icon" /></span>
    <span class="list-row__body">
      <span class="list-row__title">{{ title }}</span>
      <span v-if="sub" class="list-row__sub">{{ sub }}</span>
    </span>
    <span v-if="$slots.right" class="list-row__right"><slot name="right" /></span>
    <span
      v-else-if="amount"
      class="list-row__amount num"
      :class="{ 'is-pos': amountTone === 'pos', 'is-neg': amountTone === 'neg', 'is-settled': amountTone === 'settled' }"
    >{{ amount }}</span>
  </component>
</template>

<style scoped>
.list-row--interactive {
  background: transparent;
  border: 0;
  width: 100%;
  text-align: start;
  display: flex;
}
.list-row__right {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
}
</style>
