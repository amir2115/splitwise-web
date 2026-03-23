import { describe, expect, it } from 'vitest'
import { digitsOnly, parseAmountInput } from '@/shared/utils/format'
import { splitEqually, validateExpenseDraft } from '@/shared/utils/expense'

describe('format utils', () => {
  it('normalizes Persian digits', () => {
    expect(digitsOnly('۱۲۳۴۵')).toBe('12345')
    expect(parseAmountInput('۹۸۷,۶۵۴')).toBe(987654)
  })
})

describe('expense validation', () => {
  it('normalizes equal split using sorted member ids', () => {
    expect(splitEqually(10, ['b', 'a', 'c'])).toEqual([
      { member_id: 'a', amount: 4 },
      { member_id: 'b', amount: 3 },
      { member_id: 'c', amount: 3 },
    ])
  })

  it('rejects exact shares when totals mismatch', () => {
    const result = validateExpenseDraft({
      title: 'Dinner',
      totalAmount: 300,
      splitType: 'EXACT',
      payers: [{ member_id: 'a', amount: 300 }],
      shares: [
        { member_id: 'a', amount: 100 },
        { member_id: 'b', amount: 150 },
      ],
    })

    expect(result.isValid).toBe(false)
    expect(result.messageKey).toBe('EXPENSE_SHARE_TOTAL_MISMATCH')
  })
})
