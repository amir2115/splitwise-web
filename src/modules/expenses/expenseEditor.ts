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

export interface MemberCostBreakdown {
  baseShare: number
  taxShare: number
  serviceChargeShare: number
  finalShare: number
}

export interface ExpenseEditorComputedState {
  payerTotal: number
  baseShareTotal: number
  finalShareTotal: number
  remainingPayerAmount: number
  remainingBaseShareAmount: number
  isPayerOverflow: boolean
  isBaseShareOverflow: boolean
  taxAmountPreview: number
  baseAmountPreview: number
  serviceChargeTotalPreview: number
  hasInvalidServiceCharges: boolean
  hasInvalidTaxPercent: boolean
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
  taxEnabled: boolean
  taxPercentInput: string
  serviceCharges: ServiceChargeDraftUi[]
}): ExpenseEditorComputedState {
  const { totalAmount, splitType, members, taxEnabled, taxPercentInput, serviceCharges } = params
  const payerTotal = members.reduce((sum, member) => sum + parseAmountInput(member.payerAmountInput), 0)
  const includedMembers = members.filter((member) => member.includedInSplit).sort((a, b) => a.memberId.localeCompare(b.memberId))

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

  const hasInvalidServiceCharges =
    serviceChargeAllocations.some((allocation) => allocation.charge.title || allocation.charge.amountInput || allocation.charge.selectedMemberIds.length > 0) &&
    serviceChargeAllocations.some((allocation) => !allocation.isValid)

  const serviceChargeTotalPreview = serviceChargeAllocations
    .filter((allocation) => allocation.isValid)
    .reduce((sum, allocation) => sum + allocation.amount, 0)

  const taxPercentValue = parseAmountInput(taxPercentInput)
  const hasInvalidTaxPercent = taxEnabled && taxPercentInput !== '' && (taxPercentValue < 0 || taxPercentValue > 100)
  const taxableTotal = Math.max(totalAmount - serviceChargeTotalPreview, 0)
  const taxAmountPreview =
    !taxEnabled || taxableTotal <= 0 || hasInvalidTaxPercent
      ? 0
      : taxableTotal - Math.max(0, Math.min(taxableTotal, Math.round((taxableTotal * 100) / (100 + taxPercentValue))))
  const baseAmountPreview = taxableTotal <= 0 ? 0 : taxableTotal - taxAmountPreview

  const baseShares =
    splitType === 'EQUAL'
      ? splitAmountDeterministically(baseAmountPreview, includedMembers.map((member) => member.memberId))
      : Object.fromEntries(includedMembers.map((member) => [member.memberId, parseAmountInput(member.exactShareInput)]))

  const baseShareTotal = Object.values(baseShares).reduce((sum, amount) => sum + amount, 0)
  const taxShares =
    taxEnabled && taxAmountPreview > 0 && baseShareTotal > 0
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

  const memberBreakdowns = Object.fromEntries(
    includedMembers.map((member) => {
      const baseShare = baseShares[member.memberId] ?? 0
      const taxShare = taxShares[member.memberId] ?? 0
      const serviceChargeShare = serviceShares[member.memberId] ?? 0
      return [
        member.memberId,
        {
          baseShare,
          taxShare,
          serviceChargeShare,
          finalShare: baseShare + taxShare + serviceChargeShare,
        },
      ]
    }),
  )

  const finalShareTotal = Object.values(memberBreakdowns).reduce((sum, breakdown) => sum + breakdown.finalShare, 0)

  return {
    payerTotal,
    baseShareTotal,
    finalShareTotal,
    remainingPayerAmount: totalAmount - payerTotal,
    remainingBaseShareAmount: baseAmountPreview - baseShareTotal,
    isPayerOverflow: payerTotal > totalAmount,
    isBaseShareOverflow: baseShareTotal > baseAmountPreview,
    taxAmountPreview,
    baseAmountPreview,
    serviceChargeTotalPreview,
    hasInvalidServiceCharges,
    hasInvalidTaxPercent,
    memberBreakdowns,
  }
}
