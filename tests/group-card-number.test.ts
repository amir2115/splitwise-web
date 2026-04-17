import { describe, expect, it } from 'vitest'
import { fillCardChunksFromInput, formatReadableCardNumber, mergeCardChunks, normalizeCardChunkInput, splitCardNumberIntoChunks } from '@/modules/groupCards/cardNumber'

describe('group card number helpers', () => {
  it('formats a canonical number for display', () => {
    expect(formatReadableCardNumber('6037991899754321')).toBe('6037 9918 9975 4321')
  })

  it('splits and merges full card numbers with localized digits', () => {
    expect(splitCardNumberIntoChunks('۵۰۲۲۲۹۱۰۷۳۷۷۹۹۹۹')).toEqual(['5022', '2910', '7377', '9999'])
    expect(mergeCardChunks(['۵۰۲۲', '2910', '73-77', '9999'])).toBe('5022291073779999')
  })

  it('normalizes a chunk to four digits', () => {
    expect(normalizeCardChunkInput('۱۲۳۴۵')).toBe('1234')
  })

  it('fills four chunks from a pasted card number', () => {
    expect(fillCardChunksFromInput('6037 9918 9975 4321')).toEqual(['6037', '9918', '9975', '4321'])
  })
})
