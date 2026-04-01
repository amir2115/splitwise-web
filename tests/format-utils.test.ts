import { describe, expect, it } from 'vitest'
import { formatAmountInput } from '@/shared/utils/format'

describe('formatAmountInput', () => {
  it('formats english digits with thousand separators', () => {
    expect(formatAmountInput('3200000', 'en')).toBe('3,200,000')
  })

  it('formats persian digits with localized thousand separators', () => {
    expect(formatAmountInput('۳۲۰۰۰۰۰', 'fa')).toBe('۳٬۲۰۰٬۰۰۰')
  })

  it('returns empty string for empty input', () => {
    expect(formatAmountInput('', 'fa')).toBe('')
  })
})
