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

  it('formats calculator expression input with grouping separators', async () => {
    const wrapper = mount(CalculatorAmountInput, {
      props: {
        modelValue: '',
        label: 'Amount',
      },
      attachTo: document.body,
    })

    await wrapper.get('.amount-field__icon-button').trigger('click')

    const input = document.body.querySelector('.calculator-expression-input') as HTMLInputElement | null
    expect(input).not.toBeNull()
    input!.value = '12000+3000'
    input!.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()

    expect(input!.value).toBe('12,000+3,000')
  })

  it('keeps focus on the calculator expression input when keypad buttons are clicked', async () => {
    const wrapper = mount(CalculatorAmountInput, {
      props: {
        modelValue: '',
        label: 'Amount',
      },
      attachTo: document.body,
    })

    await wrapper.get('.amount-field__icon-button').trigger('click')

    const input = document.body.querySelector('.calculator-expression-input') as HTMLInputElement | null
    expect(input).not.toBeNull()

    input!.focus()
    input!.setSelectionRange(0, 0)

    const button = Array.from(document.body.querySelectorAll('.calculator-key')).find((item) => item.textContent?.trim() === '7') as
      | HTMLButtonElement
      | undefined
    expect(button).toBeDefined()

    button!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    button!.click()
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(input)
    expect(input!.value).toBe('7')
  })

  it('keeps keypad operators on the right in persian mode and keeps expression input ltr', async () => {
    window.localStorage.setItem('offline-splitwise.language', 'fa')

    const wrapper = mount(CalculatorAmountInput, {
      props: {
        modelValue: '',
        label: 'مبلغ',
      },
      attachTo: document.body,
    })

    await wrapper.get('.amount-field__icon-button').trigger('click')

    const expressionInput = document.body.querySelector('.calculator-expression-input') as HTMLInputElement | null
    expect(expressionInput?.getAttribute('dir')).toBe('ltr')

    const firstOperatorRow = Array.from(document.body.querySelectorAll('.calculator-key-row'))[1]
    const tokens = Array.from(firstOperatorRow.querySelectorAll('.calculator-key')).map((item) => item.textContent?.trim())

    expect(tokens).toEqual(['7', '8', '9', '/'])
  })
})
