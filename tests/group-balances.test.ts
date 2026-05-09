import { describe, expect, it } from 'vitest'
import { deriveGroupBalances, projectMemberBreakdown } from '@/modules/balances/groupBalances'

describe('deriveGroupBalances', () => {
  it('derives equal-split member balances from expenses and settlements', () => {
    const result = deriveGroupBalances({
      groupId: 'group-1',
      members: [
        {
          id: 'amir',
          group_id: 'group-1',
          username: 'amir',
          is_archived: false,
          membership_status: 'ACTIVE',
          user_id: null,
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
        {
          id: 'feri',
          group_id: 'group-1',
          username: 'feri',
          is_archived: false,
          membership_status: 'ACTIVE',
          user_id: null,
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
      ],
      expenses: [
        {
          id: 'expense-1',
          group_id: 'group-1',
          title: 'Dinner',
          note: null,
          total_amount: 3423434,
          split_type: 'EQUAL',
          user_id: 'user-1',
          payers: [{ member_id: 'feri', amount: 3423434 }],
          shares: [
            { member_id: 'amir', amount: 1711717 },
            { member_id: 'feri', amount: 1711717 },
          ],
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
      ],
      settlements: [],
    })

    expect(result.balances).toEqual([
      {
        member_id: 'feri',
        member_name: 'feri',
        paid_total: 3423434,
        owed_total: 1711717,
        net_balance: 1711717,
      },
      {
        member_id: 'amir',
        member_name: 'amir',
        paid_total: 0,
        owed_total: 1711717,
        net_balance: -1711717,
      },
    ])

    expect(result.simplified_debts).toEqual([
      {
        from_member_id: 'amir',
        to_member_id: 'feri',
        amount: 1711717,
      },
    ])
  })
})

describe('projectMemberBreakdown', () => {
  const transfers = [
    { from_member_id: 'sultan', to_member_id: 'amir', amount: 272000 },
    { from_member_id: 'moein', to_member_id: 'amir', amount: 136000 },
    { from_member_id: 'sultan', to_member_id: 'feri', amount: 50000 },
  ]

  it('returns incoming entries for a creditor (net > 0)', () => {
    const entries = projectMemberBreakdown('amir', 408000, transfers)
    expect(entries).toEqual([
      { transfer: transfers[0], other_member_id: 'sultan', kind: 'incoming' },
      { transfer: transfers[1], other_member_id: 'moein', kind: 'incoming' },
    ])
  })

  it('returns outgoing entries for a debtor (net < 0)', () => {
    const entries = projectMemberBreakdown('sultan', -322000, transfers)
    expect(entries).toEqual([
      { transfer: transfers[0], other_member_id: 'amir', kind: 'outgoing' },
      { transfer: transfers[2], other_member_id: 'feri', kind: 'outgoing' },
    ])
  })

  it('returns an empty list for a settled member (net === 0)', () => {
    const entries = projectMemberBreakdown('amir', 0, transfers)
    expect(entries).toEqual([])
  })

  it('returns an empty list when there are no transfers', () => {
    const entries = projectMemberBreakdown('amir', 100, [])
    expect(entries).toEqual([])
  })
})
