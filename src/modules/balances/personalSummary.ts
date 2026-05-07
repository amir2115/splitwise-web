import type { Member, SimplifiedDebt } from '@/shared/api/types'

export interface PersonalSimplifiedDebtItem {
  other_member_id: string
  amount: number
  from_member_id: string
  to_member_id: string
}

export interface PersonalSimplifiedDebtSummary {
  current_member_id: string | null
  receivables: PersonalSimplifiedDebtItem[]
  payables: PersonalSimplifiedDebtItem[]
}

export type PersonalDebtKind = 'receivable' | 'payable'

export function buildSettlementDraftQuery(item: PersonalSimplifiedDebtItem) {
  return {
    from: item.from_member_id,
    to: item.to_member_id,
    amount: String(item.amount),
  }
}

export function derivePersonalSimplifiedDebtSummary(params: {
  members: Member[]
  simplifiedDebts: SimplifiedDebt[]
  currentUserId: string | null | undefined
}): PersonalSimplifiedDebtSummary {
  const currentMemberId = params.members.find((member) => member.user_id === params.currentUserId)?.id ?? null

  if (!currentMemberId) {
    return {
      current_member_id: null,
      receivables: [],
      payables: [],
    }
  }

  return params.simplifiedDebts.reduce<PersonalSimplifiedDebtSummary>(
    (summary, debt) => {
      if (debt.to_member_id === currentMemberId) {
        summary.receivables.push({
          other_member_id: debt.from_member_id,
          amount: debt.amount,
          from_member_id: debt.from_member_id,
          to_member_id: currentMemberId,
        })
      }

      if (debt.from_member_id === currentMemberId) {
        summary.payables.push({
          other_member_id: debt.to_member_id,
          amount: debt.amount,
          from_member_id: currentMemberId,
          to_member_id: debt.to_member_id,
        })
      }

      return summary
    },
    {
      current_member_id: currentMemberId,
      receivables: [],
      payables: [],
    },
  )
}
