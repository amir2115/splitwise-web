import type { SplitType } from '@/shared/api/types'
import { parseAmountInput } from '@/shared/utils/format'

export interface ExpenseEditorMemberDraft {
  memberId: string
  username: string
  includedInSplit: boolean
  payerAmountInput: string
  exactShareInput: string
}

export interface ServiceChargeDraftUi {
  id: string
  title: string
  amountInput: string
  selectedMemberIds: string[]
}

export type AmountMode = 'percent' | 'amount'
export type DiscountMode = AmountMode

export interface DiscountDraft {
  enabled: boolean
  mode: DiscountMode
  /** When `mode === 'percent'`, this is the percent value (0..100). Otherwise it's a fixed amount. */
  valueInput: string
}

export interface TaxDraft {
  enabled: boolean
  mode: AmountMode
  /** When `mode === 'percent'`, percent value (0..100). When `'amount'`, fixed extra Toman added on top. */
  valueInput: string
}

export interface MemberCostBreakdown {
  baseShare: number
  taxShare: number
  serviceChargeShare: number
  discountShare: number
  finalShare: number
}

export interface ExpenseEditorComputedState {
  payerTotal: number
  baseShareTotal: number
  finalShareTotal: number
  finalGrandTotal: number
  remainingPayerAmount: number
  remainingBaseShareAmount: number
  isPayerOverflow: boolean
  isBaseShareOverflow: boolean
  taxAmountPreview: number
  baseAmountPreview: number
  serviceChargeTotalPreview: number
  discountAmountPreview: number
  hasInvalidServiceCharges: boolean
  hasInvalidTaxPercent: boolean
  hasInvalidDiscount: boolean
  memberBreakdowns: Record<string, MemberCostBreakdown>
}

interface ServiceChargeAllocation {
  charge: ServiceChargeDraftUi
  amount: number
  selectedMemberIds: string[]
  perMemberAmounts: Record<string, number>
  isValid: boolean
}

export function splitAmountDeterministically(total: number, memberIds: string[]) {
  if (total <= 0 || memberIds.length === 0) {
    return Object.fromEntries(memberIds.map((memberId) => [memberId, 0]))
  }

  const sorted = [...memberIds].sort()
  const base = Math.floor(total / sorted.length)
  const extraCount = total % sorted.length
  return Object.fromEntries(sorted.map((memberId, index) => [memberId, base + (index < extraCount ? 1 : 0)]))
}

export function distributeProportionally(total: number, weights: Record<string, number>) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0)
  if (total <= 0 || entries.length === 0) {
    return Object.fromEntries(Object.keys(weights).map((key) => [key, 0]))
  }

  const weightTotal = entries.reduce((sum, [, weight]) => sum + weight, 0)
  const provisional = entries.map(([memberId, weight]) => {
    const scaled = (weight * total) / weightTotal
    return {
      memberId,
      baseAmount: Math.trunc(scaled),
      remainder: scaled - Math.trunc(scaled),
    }
  })

  let remaining = total - provisional.reduce((sum, item) => sum + item.baseAmount, 0)
  const bonuses = Object.fromEntries(
    [...provisional]
      .sort((a, b) => (b.remainder === a.remainder ? a.memberId.localeCompare(b.memberId) : b.remainder - a.remainder))
      .map((item) => {
        const bonus = remaining > 0 ? 1 : 0
        if (remaining > 0) remaining -= 1
        return [item.memberId, bonus]
      }),
  )

  return Object.fromEntries(
    Object.keys(weights)
      .sort()
      .map((memberId) => {
        const item = provisional.find((entry) => entry.memberId === memberId)
        return [memberId, item ? item.baseAmount + (bonuses[memberId] ?? 0) : 0]
      }),
  )
}

export function computeExpenseEditorState(params: {
  totalAmount: number
  splitType: SplitType
  members: ExpenseEditorMemberDraft[]
  /** Legacy boolean flag — used when `tax` is not provided. */
  taxEnabled?: boolean
  /** Legacy percent input — used when `tax` is not provided. */
  taxPercentInput?: string
  /** Modern tax draft (preferred). When provided, overrides `taxEnabled`/`taxPercentInput`. */
  tax?: TaxDraft
  serviceCharges: ServiceChargeDraftUi[]
  discount?: DiscountDraft
}): ExpenseEditorComputedState {
  const { totalAmount, splitType, members, serviceCharges } = params
  const tax: TaxDraft = params.tax ?? {
    enabled: Boolean(params.taxEnabled),
    mode: 'percent',
    valueInput: params.taxPercentInput ?? '',
  }
  const discount: DiscountDraft = params.discount ?? { enabled: false, mode: 'percent', valueInput: '' }
  const payerTotal = members.reduce((sum, member) => sum + parseAmountInput(member.payerAmountInput), 0)
  const includedMembers = members.filter((member) => member.includedInSplit).sort((a, b) => a.memberId.localeCompare(b.memberId))

  // A service charge is "active" if the user has typed *anything* in it. Empty rows
  // (no title, no amount, no members) are ignored and don't trigger validation.
  const serviceChargeAllocations: ServiceChargeAllocation[] = serviceCharges.map((charge) => {
    const amount = parseAmountInput(charge.amountInput)
    const selectedIds = includedMembers.map((member) => member.memberId).filter((memberId) => charge.selectedMemberIds.includes(memberId))
    return {
      charge,
      amount,
      selectedMemberIds: selectedIds,
      perMemberAmounts: amount > 0 && selectedIds.length > 0 ? splitAmountDeterministically(amount, selectedIds) : {},
      isValid: amount > 0 && selectedIds.length > 0,
    }
  })

  const hasInvalidServiceCharges = serviceChargeAllocations.some((allocation) => {
    const c = allocation.charge
    const isEmpty = !c.title.trim() && !c.amountInput && c.selectedMemberIds.length === 0
    return !isEmpty && !allocation.isValid
  })

  const serviceChargeTotalPreview = serviceChargeAllocations
    .filter((allocation) => allocation.isValid)
    .reduce((sum, allocation) => sum + allocation.amount, 0)

  const taxValueRaw = parseAmountInput(tax.valueInput)
  const hasInvalidTaxPercent =
    tax.enabled &&
    tax.valueInput !== '' &&
    (
      tax.mode === 'percent'
        ? (taxValueRaw < 0 || taxValueRaw > 100)
        : taxValueRaw < 0
    )
  // Two semantics:
  // - mode === 'percent': tax is *included* in totalAmount; we extract base & tax (legacy).
  // - mode === 'amount':   tax is an additional fixed amount added on top, services are still inside totalAmount.
  const taxableTotal = Math.max(totalAmount - serviceChargeTotalPreview, 0)
  let taxAmountPreview = 0
  let baseAmountPreview = 0
  if (!tax.enabled || taxableTotal <= 0 || hasInvalidTaxPercent || tax.valueInput === '') {
    baseAmountPreview = taxableTotal
  } else if (tax.mode === 'percent') {
    taxAmountPreview = taxableTotal - Math.max(0, Math.min(taxableTotal, Math.round((taxableTotal * 100) / (100 + taxValueRaw))))
    baseAmountPreview = taxableTotal - taxAmountPreview
  } else {
    // amount mode: tax is added on top of base. So base = taxableTotal (totalAmount - services), tax = fixed.
    taxAmountPreview = Math.max(0, Math.min(taxValueRaw, Number.MAX_SAFE_INTEGER))
    baseAmountPreview = taxableTotal
  }

  const baseShares =
    splitType === 'EQUAL'
      ? splitAmountDeterministically(baseAmountPreview, includedMembers.map((member) => member.memberId))
      : Object.fromEntries(includedMembers.map((member) => [member.memberId, parseAmountInput(member.exactShareInput)]))

  const baseShareTotal = Object.values(baseShares).reduce((sum, amount) => sum + amount, 0)
  const taxShares =
    tax.enabled && taxAmountPreview > 0 && baseShareTotal > 0
      ? distributeProportionally(
          taxAmountPreview,
          Object.fromEntries(Object.entries(baseShares).filter(([, amount]) => amount > 0)),
        )
      : Object.fromEntries(includedMembers.map((member) => [member.memberId, 0]))

  const serviceShares = Object.fromEntries(includedMembers.map((member) => [member.memberId, 0]))
  serviceChargeAllocations
    .filter((allocation) => allocation.isValid)
    .forEach((allocation) => {
      Object.entries(allocation.perMemberAmounts).forEach(([memberId, amount]) => {
        serviceShares[memberId] = (serviceShares[memberId] ?? 0) + amount
      })
    })

  // Pre-discount grand total. In percent mode, tax is already inside totalAmount.
  // In amount mode, tax is added on top.
  const preDiscountGrandTotal =
    tax.enabled && tax.mode === 'amount' && !hasInvalidTaxPercent
      ? totalAmount + taxAmountPreview
      : totalAmount

  // ---------- Discount ----------
  const discountValue = parseAmountInput(discount.valueInput)
  const hasInvalidDiscount =
    discount.enabled &&
    discount.valueInput !== '' &&
    (
      discount.mode === 'percent'
        ? (discountValue < 0 || discountValue > 100)
        : discountValue < 0 || discountValue > preDiscountGrandTotal
    )

  // Pre-discount total = baseShares + taxShares + serviceShares (for each member). We rely on
  // the totalAmount input as the canonical pre-discount grand total. If member shares don't yet
  // sum to it (e.g. EXACT mode mid-typing), discount is computed against `totalAmount` so the
  // user sees the eventual final grand total.
  const discountAmountPreview = (() => {
    if (!discount.enabled || discount.valueInput === '' || hasInvalidDiscount || preDiscountGrandTotal <= 0) return 0
    if (discount.mode === 'percent') {
      const v = Math.min(100, Math.max(0, discountValue))
      return Math.min(preDiscountGrandTotal, Math.round((preDiscountGrandTotal * v) / 100))
    }
    return Math.min(preDiscountGrandTotal, Math.max(0, discountValue))
  })()

  // Distribute discount proportionally to (base + tax + service) shares.
  const preDiscountWeights = Object.fromEntries(
    includedMembers.map((member) => {
      const sum = (baseShares[member.memberId] ?? 0) + (taxShares[member.memberId] ?? 0) + (serviceShares[member.memberId] ?? 0)
      return [member.memberId, sum]
    }),
  )
  const totalPreDiscount = Object.values(preDiscountWeights).reduce((sum, value) => sum + value, 0)
  const cappedDiscount = Math.min(discountAmountPreview, totalPreDiscount)
  const discountShares =
    cappedDiscount > 0 && totalPreDiscount > 0
      ? distributeProportionally(cappedDiscount, preDiscountWeights)
      : Object.fromEntries(includedMembers.map((member) => [member.memberId, 0]))

  const memberBreakdowns = Object.fromEntries(
    includedMembers.map((member) => {
      const baseShare = baseShares[member.memberId] ?? 0
      const taxShare = taxShares[member.memberId] ?? 0
      const serviceChargeShare = serviceShares[member.memberId] ?? 0
      const discountShare = discountShares[member.memberId] ?? 0
      const finalShare = Math.max(0, baseShare + taxShare + serviceChargeShare - discountShare)
      return [
        member.memberId,
        {
          baseShare,
          taxShare,
          serviceChargeShare,
          discountShare,
          finalShare,
        },
      ]
    }),
  )

  const finalShareTotal = Object.values(memberBreakdowns).reduce((sum, breakdown) => sum + breakdown.finalShare, 0)
  const finalGrandTotal = Math.max(0, preDiscountGrandTotal - cappedDiscount)

  return {
    payerTotal,
    baseShareTotal,
    finalShareTotal,
    finalGrandTotal,
    remainingPayerAmount: finalGrandTotal - payerTotal,
    remainingBaseShareAmount: baseAmountPreview - baseShareTotal,
    isPayerOverflow: payerTotal > finalGrandTotal,
    isBaseShareOverflow: baseShareTotal > baseAmountPreview,
    taxAmountPreview,
    baseAmountPreview,
    serviceChargeTotalPreview,
    discountAmountPreview: cappedDiscount,
    hasInvalidServiceCharges,
    hasInvalidTaxPercent,
    hasInvalidDiscount,
    memberBreakdowns,
  }
}
