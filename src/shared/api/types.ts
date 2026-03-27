export type AppLanguage = 'fa' | 'en'
export type ThemeMode = 'light' | 'dark'
export type SplitType = 'EQUAL' | 'EXACT'
export type MembershipStatus = 'ACTIVE' | 'PENDING_INVITE'
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface User {
  id: string
  name: string
  username: string
  created_at: string
  updated_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AuthResponse {
  user: User
  tokens: TokenPair
}

export interface Group {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Member {
  id: string
  group_id: string
  username: string
  is_archived: boolean
  membership_status: MembershipStatus
  user_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AddMemberResponse {
  outcome: 'added' | 'invite_sent' | 'already_member'
  member: Member
}

export interface GroupInvite {
  id: string
  group_id: string
  inviter_user_id: string
  invitee_user_id: string
  status: InviteStatus
  group_name: string
  inviter_username: string
  invitee_username: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ExpenseParticipantAmount {
  member_id: string
  amount: number
}

export interface Expense {
  id: string
  group_id: string
  title: string
  note: string | null
  total_amount: number
  split_type: SplitType
  user_id: string
  payers: ExpenseParticipantAmount[]
  shares: ExpenseParticipantAmount[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Settlement {
  id: string
  group_id: string
  from_member_id: string
  to_member_id: string
  amount: number
  note: string | null
  user_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MemberBalance {
  member_id: string
  member_name: string
  paid_total: number
  owed_total: number
  net_balance: number
}

export interface SimplifiedDebt {
  from_member_id: string
  to_member_id: string
  amount: number
}

export interface GroupBalanceResponse {
  group_id: string
  balances: MemberBalance[]
  simplified_debts: SimplifiedDebt[]
}

export interface AppDownloadContent {
  title: string
  subtitle: string
  app_icon_url: string | null
  version_name: string | null
  version_code: number | null
  release_date: string | null
  file_size: string | null
  bazaar_url: string | null
  myket_url: string | null
  direct_download_url: string | null
  release_notes: string[]
  primary_badge_text: string | null
  is_direct_download_enabled: boolean
}
