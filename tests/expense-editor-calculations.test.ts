import { describe, expect, it } from 'vitest'
import { computeExpenseEditorState, distributeProportionally, splitAmountDeterministically } from '@/modules/expenses/expenseEditor'

describe('expense editor calculations', () => {
  it('calculates remaining payer and base share amounts', () => {
    const state = computeExpenseEditorState({
      totalAmount: 13000,
      splitType: 'EXACT',
      members: [
        { memberId: '1', username: 'a', includedInSplit: true, payerAmountInput: '8000', exactShareInput: '3000' },
        { memberId: '2', username: 'b', includedInSplit: true, payerAmountInput: '2000', exactShareInput: '1000' },
        { memberId: '3', username: 'c', includedInSplit: true, payerAmountInput: '', exactShareInput: '' },
      ],
      taxEnabled: false,
      taxPercentInput: '',
      serviceCharges: [],
    })

    expect(state.payerTotal).toBe(10000)
    expect(state.remainingPayerAmount).toBe(3000)
    expect(state.baseShareTotal).toBe(4000)
    expect(state.remainingBaseShareAmount).toBe(9000)
  })

  it('derives base tax and service breakdown', () => {
    const state = computeExpenseEditorState({
      totalAmount: 100000,
      splitType: 'EXACT',
      members: [
        { memberId: '1', username: 'a', includedInSplit: true, payerAmountInput: '', exactShareInput: '59091' },
        { memberId: '2', username: 'b', includedInSplit: true, payerAmountInput: '', exactShareInput: '27273' },
      ],
      taxEnabled: true,
      taxPercentInput: '10',
      serviceCharges: [
        {
          id: 'svc1',
          title: 'service',
          amountInput: '5000',
          selectedMemberIds: ['1', '2'],
        },
      ],
    })

    expect(state.serviceChargeTotalPreview).toBe(5000)
    expect(state.baseAmountPreview).toBe(86364)
    expect(state.taxAmountPreview).toBe(8636)
    expect(state.finalShareTotal).toBe(100000)
    expect(state.memberBreakdowns['1']?.finalShare).toBe(67500)
    expect(state.memberBreakdowns['2']?.finalShare).toBe(32500)
  })

  it('marks service charge without members as invalid', () => {
    const state = computeExpenseEditorState({
      totalAmount: 10000,
      splitType: 'EQUAL',
      members: [
        { memberId: '1', username: 'a', includedInSplit: true, payerAmountInput: '', exactShareInput: '' },
        { memberId: '2', username: 'b', includedInSplit: true, payerAmountInput: '', exactShareInput: '' },
      ],
      taxEnabled: false,
      taxPercentInput: '',
      serviceCharges: [
        {
          id: 'svc1',
          title: 'service',
          amountInput: '2000',
          selectedMemberIds: [],
        },
      ],
    })

    expect(state.hasInvalidServiceCharges).toBe(true)
  })

  it('distributes deterministic remainders predictably', () => {
    expect(splitAmountDeterministically(5, ['b', 'a'])).toEqual({ a: 3, b: 2 })
  })

  it('distributes proportional totals exactly', () => {
    const distributed = distributeProportionally(550, { '1': 3000, '2': 2000 })
    expect(Object.values(distributed).reduce((sum, amount) => sum + amount, 0)).toBe(550)
    expect(Object.values(distributed).every((amount) => amount >= 0)).toBe(true)
  })
})
