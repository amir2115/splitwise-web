import { describe, expect, it } from 'vitest'
import { buildSettlementDraftQuery, derivePersonalSimplifiedDebtSummary } from '@/modules/balances/personalSummary'
import type { Member, SimplifiedDebt } from '@/shared/api/types'

function buildMember(id: string, userId: string | null = null): Member {
  return {
    id,
    group_id: 'group-1',
    username: id,
    is_archived: false,
    membership_status: 'ACTIVE',
    user_id: userId,
    created_at: '',
    updated_at: '',
    deleted_at: null,
  }
}

function buildDebt(fromMemberId: string, toMemberId: string, amount: number): SimplifiedDebt {
  return {
    from_member_id: fromMemberId,
    to_member_id: toMemberId,
    amount,
  }
}

describe('derivePersonalSimplifiedDebtSummary', () => {
  it('returns only receivables for the current member when they are only a creditor', () => {
    const result = derivePersonalSimplifiedDebtSummary({
      members: [buildMember('amir', 'user-1'), buildMember('sara')],
      simplifiedDebts: [buildDebt('sara', 'amir', 250000)],
      currentUserId: 'user-1',
    })

    expect(result.current_member_id).toBe('amir')
    expect(result.receivables).toEqual([
      {
        other_member_id: 'sara',
        amount: 250000,
        from_member_id: 'sara',
        to_member_id: 'amir',
      },
    ])
    expect(result.payables).toEqual([])
  })

  it('returns only payables for the current member when they are only a debtor', () => {
    const result = derivePersonalSimplifiedDebtSummary({
      members: [buildMember('amir', 'user-1'), buildMember('sara')],
      simplifiedDebts: [buildDebt('amir', 'sara', 120000)],
      currentUserId: 'user-1',
    })

    expect(result.current_member_id).toBe('amir')
    expect(result.receivables).toEqual([])
    expect(result.payables).toEqual([
      {
        other_member_id: 'sara',
        amount: 120000,
        from_member_id: 'amir',
        to_member_id: 'sara',
      },
    ])
  })

  it('returns receivables and payables together when the current member has both', () => {
    const result = derivePersonalSimplifiedDebtSummary({
      members: [buildMember('amir', 'user-1'), buildMember('sara'), buildMember('mina')],
      simplifiedDebts: [buildDebt('sara', 'amir', 90000), buildDebt('amir', 'mina', 60000)],
      currentUserId: 'user-1',
    })

    expect(result.current_member_id).toBe('amir')
    expect(result.receivables).toHaveLength(1)
    expect(result.payables).toHaveLength(1)
  })

  it('returns an empty summary when the current user has no matching member', () => {
    const result = derivePersonalSimplifiedDebtSummary({
      members: [buildMember('amir'), buildMember('sara')],
      simplifiedDebts: [buildDebt('sara', 'amir', 90000)],
      currentUserId: 'user-1',
    })

    expect(result).toEqual({
      current_member_id: null,
      receivables: [],
      payables: [],
    })
  })

  it('returns an empty summary when there are no simplified debts', () => {
    const result = derivePersonalSimplifiedDebtSummary({
      members: [buildMember('amir', 'user-1'), buildMember('sara')],
      simplifiedDebts: [],
      currentUserId: 'user-1',
    })

    expect(result.current_member_id).toBe('amir')
    expect(result.receivables).toEqual([])
    expect(result.payables).toEqual([])
  })
})

describe('buildSettlementDraftQuery', () => {
  it('builds settlement query for a receivable item', () => {
    expect(
      buildSettlementDraftQuery({
        other_member_id: 'sara',
        amount: 250000,
        from_member_id: 'sara',
        to_member_id: 'amir',
      }),
    ).toEqual({
      from: 'sara',
      to: 'amir',
      amount: '250000',
    })
  })

  it('builds settlement query for a payable item', () => {
    expect(
      buildSettlementDraftQuery({
        other_member_id: 'sara',
        amount: 120000,
        from_member_id: 'amir',
        to_member_id: 'sara',
      }),
    ).toEqual({
      from: 'amir',
      to: 'sara',
      amount: '120000',
    })
  })
})
