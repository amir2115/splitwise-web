import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import CalculatorAmountInput from '@/shared/components/CalculatorAmountInput.vue'

describe('CalculatorAmountInput', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('offline-splitwise.language', 'en')
    document.body.innerHTML = ''
    setActivePinia(createPinia())
  })

  it('formats amount input with grouping separators while keeping digits in model', async () => {
    const wrapper = mount(
      defineComponent({
        components: { CalculatorAmountInput },
        setup() {
          const value = ref('')
          return { value }
        },
        template: '<CalculatorAmountInput v-model="value" label="Amount" />',
      }),
      { attachTo: document.body },
    )

    const input = wrapper.get('.amount-field__input')
    await input.setValue('1234567')

    expect((input.element as HTMLInputElement).value).toBe('1,234,567')
    expect((wrapper.vm as { value: string }).value).toBe('1234567')
  })

  it('opens calculator as a bottom sheet from the trailing icon', async () => {
    const wrapper = mount(CalculatorAmountInput, {
      props: {
        modelValue: '1000',
        label: 'Amount',
      },
      attachTo: document.body,
    })

    expect(document.body.querySelector('.calculator-sheet')).toBeNull()

    await wrapper.get('.amount-field__icon-button').trigger('click')

    expect(document.body.querySelector('.calculator-sheet')).not.toBeNull()
    expect(document.body.textContent).toContain('Calculator')
  })
})
