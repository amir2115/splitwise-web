import { describe, expect, it } from 'vitest'
import { deriveGroupBalances } from '@/modules/balances/groupBalances'

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
