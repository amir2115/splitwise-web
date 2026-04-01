import { describe, expect, it } from 'vitest'
import { evaluateCalculatorExpression, formatCalculatorDisplayValue } from '@/shared/utils/calculator'

describe('calculator expression evaluator', () => {
  it('evaluates arithmetic with precedence', () => {
    expect(evaluateCalculatorExpression('2+3*4')).toBe(14)
  })

  it('evaluates expressions with parentheses and persian digits', () => {
    expect(evaluateCalculatorExpression('(۲+۵)*۳')).toBe(21)
  })

  it('rounds fractional results', () => {
    expect(evaluateCalculatorExpression('10/3')).toBe(3)
  })

  it('rejects negative results', () => {
    expect(evaluateCalculatorExpression('4-9')).toBeNull()
  })
})

describe('calculator display formatting', () => {
  it('formats plain digits with grouping separators', () => {
    expect(formatCalculatorDisplayValue('1000')).toBe('1,000')
  })

  it('formats persian digits with grouping separators', () => {
    expect(formatCalculatorDisplayValue('۱۲۳۴۵۶۷')).toBe('1,234,567')
  })

  it('formats valid expressions using their evaluated result', () => {
    expect(formatCalculatorDisplayValue('2+3*4')).toBe('14')
  })

  it('returns null for invalid expressions', () => {
    expect(formatCalculatorDisplayValue('2+')).toBeNull()
  })
})
