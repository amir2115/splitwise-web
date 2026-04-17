import { useBalancesStore } from '@/modules/balances/store'
import { useExpensesStore } from '@/modules/expenses/store'
import { useGroupCardsStore } from '@/modules/groupCards/store'
import { useGroupInvitesStore } from '@/modules/groupInvites/store'
import { useGroupsStore } from '@/modules/groups/store'
import { useMembersStore } from '@/modules/members/store'
import { useSettlementsStore } from '@/modules/settlements/store'

export function resetSessionData() {
  useGroupsStore().reset()
  useGroupCardsStore().reset()
  useGroupInvitesStore().reset()
  useMembersStore().reset()
  useExpensesStore().reset()
  useBalancesStore().reset()
  useSettlementsStore().reset()
}
