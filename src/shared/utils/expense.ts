import type { ExpenseParticipantAmount, SplitType } from '@/shared/api/types'

export type ExpenseValidationMessageKey =
  | 'EXPENSE_TOTAL_POSITIVE'
  | 'EXPENSE_AT_LEAST_ONE_PAYER'
  | 'EXPENSE_AT_LEAST_ONE_SHARE'
  | 'EXPENSE_NEGATIVE_VALUES'
  | 'EXPENSE_PAYER_TOTAL_MISMATCH'
  | 'EXPENSE_SHARE_TOTAL_MISMATCH'
  | 'EXPENSE_TITLE_REQUIRED'

export interface ExpenseDraftValidation {
  isValid: boolean
  messageKey?: ExpenseValidationMessageKey
  normalizedShares: ExpenseParticipantAmount[]
}

export function splitEqually(totalAmount: number, memberIds: string[]) {
  if (memberIds.length === 0) return []

  const sortedIds = [...memberIds].sort((a, b) => a.localeCompare(b))
  const base = Math.floor(totalAmount / sortedIds.length)
  let remainder = totalAmount % sortedIds.length

  return sortedIds.map((memberId) => {
    const extra = remainder > 0 ? 1 : 0
    if (remainder > 0) remainder -= 1
    return { member_id: memberId, amount: base + extra }
  })
}

export function validateExpenseDraft(input: {
  title: string
  totalAmount: number
  splitType: SplitType
  payers: ExpenseParticipantAmount[]
  shares: ExpenseParticipantAmount[]
}): ExpenseDraftValidation {
  const { title, totalAmount, splitType, payers, shares } = input

  if (title.trim().length === 0) {
    return { isValid: false, messageKey: 'EXPENSE_TITLE_REQUIRED', normalizedShares: [] }
  }
  if (totalAmount <= 0) {
    return { isValid: false, messageKey: 'EXPENSE_TOTAL_POSITIVE', normalizedShares: [] }
  }
  if (payers.length === 0) {
    return { isValid: false, messageKey: 'EXPENSE_AT_LEAST_ONE_PAYER', normalizedShares: [] }
  }
  if (shares.length === 0) {
    return { isValid: false, messageKey: 'EXPENSE_AT_LEAST_ONE_SHARE', normalizedShares: [] }
  }
  if (payers.some((item) => item.amount < 0) || shares.some((item) => item.amount < 0)) {
    return { isValid: false, messageKey: 'EXPENSE_NEGATIVE_VALUES', normalizedShares: [] }
  }

  const payerTotal = payers.reduce((sum, item) => sum + item.amount, 0)
  if (payerTotal !== totalAmount) {
    return { isValid: false, messageKey: 'EXPENSE_PAYER_TOTAL_MISMATCH', normalizedShares: [] }
  }

  if (splitType === 'EXACT') {
    const shareTotal = shares.reduce((sum, item) => sum + item.amount, 0)
    if (shareTotal !== totalAmount) {
      return { isValid: false, messageKey: 'EXPENSE_SHARE_TOTAL_MISMATCH', normalizedShares: [] }
    }
    return { isValid: true, normalizedShares: shares }
  }

  return {
    isValid: true,
    normalizedShares: splitEqually(totalAmount, shares.map((item) => item.member_id)),
  }
}
