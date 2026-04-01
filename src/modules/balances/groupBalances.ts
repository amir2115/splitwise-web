import type { Expense, GroupBalanceResponse, Member, Settlement } from '@/shared/api/types'

interface RunningBalance {
  member_id: string
  member_name: string
  paid_total: number
  owed_total: number
  net_balance: number
}

function ensureRunningBalance(map: Map<string, RunningBalance>, memberId: string, memberName: string) {
  if (!map.has(memberId)) {
    map.set(memberId, {
      member_id: memberId,
      member_name: memberName,
      paid_total: 0,
      owed_total: 0,
      net_balance: 0,
    })
  }

  return map.get(memberId)!
}

function simplifyDebts(balances: RunningBalance[]) {
  const creditors = balances
    .filter((balance) => balance.net_balance > 0)
    .map((balance) => ({ member_id: balance.member_id, amount: balance.net_balance }))
    .sort((left, right) => right.amount - left.amount)

  const debtors = balances
    .filter((balance) => balance.net_balance < 0)
    .map((balance) => ({ member_id: balance.member_id, amount: Math.abs(balance.net_balance) }))
    .sort((left, right) => right.amount - left.amount)

  const simplified = [] as GroupBalanceResponse['simplified_debts']
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]
    const amount = Math.min(creditor.amount, debtor.amount)

    if (amount > 0) {
      simplified.push({
        from_member_id: debtor.member_id,
        to_member_id: creditor.member_id,
        amount,
      })
    }

    creditor.amount -= amount
    debtor.amount -= amount

    if (creditor.amount <= 0) creditorIndex += 1
    if (debtor.amount <= 0) debtorIndex += 1
  }

  return simplified
}

export function deriveGroupBalances(params: {
  groupId: string
  expenses: Expense[]
  settlements: Settlement[]
  members: Member[]
}): GroupBalanceResponse {
  const { groupId, expenses, settlements, members } = params
  const balances = new Map<string, RunningBalance>()
  const memberNames = new Map(members.map((member) => [member.id, member.username]))

  const ensureMember = (memberId: string) => ensureRunningBalance(balances, memberId, memberNames.get(memberId) ?? memberId)

  members.forEach((member) => {
    ensureMember(member.id)
  })

  expenses.forEach((expense) => {
    expense.payers.forEach((payer) => {
      const balance = ensureMember(payer.member_id)
      balance.paid_total += payer.amount
      balance.net_balance += payer.amount
    })

    expense.shares.forEach((share) => {
      const balance = ensureMember(share.member_id)
      balance.owed_total += share.amount
      balance.net_balance -= share.amount
    })
  })

  settlements.forEach((settlement) => {
    const fromBalance = ensureMember(settlement.from_member_id)
    const toBalance = ensureMember(settlement.to_member_id)
    fromBalance.net_balance += settlement.amount
    toBalance.net_balance -= settlement.amount
  })

  const normalizedBalances = Array.from(balances.values())
    .map((balance) => ({
      ...balance,
      paid_total: Math.round(balance.paid_total),
      owed_total: Math.round(balance.owed_total),
      net_balance: Math.round(balance.net_balance),
    }))
    .sort((left, right) => right.net_balance - left.net_balance || left.member_name.localeCompare(right.member_name))

  return {
    group_id: groupId,
    balances: normalizedBalances,
    simplified_debts: simplifyDebts(normalizedBalances),
  }
}
