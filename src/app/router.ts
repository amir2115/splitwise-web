import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/shared/stores/auth'
import LoginPage from '@/modules/auth/pages/LoginPage.vue'
import RegisterPage from '@/modules/auth/pages/RegisterPage.vue'
import GroupsPage from '@/modules/groups/pages/GroupsPage.vue'
import GroupDashboardPage from '@/modules/groups/pages/GroupDashboardPage.vue'
import MembersPage from '@/modules/members/pages/MembersPage.vue'
import ExpenseEditorPage from '@/modules/expenses/pages/ExpenseEditorPage.vue'
import ExpenseDetailPage from '@/modules/expenses/pages/ExpenseDetailPage.vue'
import SettlementEditorPage from '@/modules/settlements/pages/SettlementEditorPage.vue'
import BalancesPage from '@/modules/balances/pages/BalancesPage.vue'
import SettingsPage from '@/modules/settings/pages/SettingsPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/groups' },
    { path: '/auth/login', component: LoginPage, meta: { guestOnly: true } },
    { path: '/auth/register', component: RegisterPage, meta: { guestOnly: true } },
    { path: '/groups', component: GroupsPage, meta: { requiresAuth: true, topLevel: true } },
    { path: '/groups/:groupId', component: GroupDashboardPage, meta: { requiresAuth: true } },
    { path: '/groups/:groupId/members', component: MembersPage, meta: { requiresAuth: true } },
    { path: '/groups/:groupId/expense/new', component: ExpenseEditorPage, meta: { requiresAuth: true } },
    { path: '/groups/:groupId/expense/:expenseId/edit', component: ExpenseEditorPage, meta: { requiresAuth: true } },
    { path: '/groups/:groupId/expense/:expenseId', component: ExpenseDetailPage, meta: { requiresAuth: true } },
    { path: '/groups/:groupId/settlement/new', component: SettlementEditorPage, meta: { requiresAuth: true } },
    { path: '/groups/:groupId/settlement/:settlementId/edit', component: SettlementEditorPage, meta: { requiresAuth: true } },
    { path: '/groups/:groupId/balances', component: BalancesPage, meta: { requiresAuth: true } },
    { path: '/settings', component: SettingsPage, meta: { requiresAuth: true, topLevel: true } },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (!authStore.bootstrapped) {
    await authStore.bootstrap()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/auth/login'
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return '/groups'
  }

  return true
})
