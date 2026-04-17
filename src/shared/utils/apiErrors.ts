import { ApiError } from '@/shared/api/client'
import type { AppStrings } from '@/shared/i18n/strings'

interface PendingMemberErrorPayload {
  error?: {
    code?: string
    details?: {
      pending_members?: Array<{
        member_id?: string
        username?: string
      }>
    }
  }
}

function formatPendingMemberNames(usernames: string[], language: 'fa' | 'en') {
  const prefix = usernames.map((username) => `@${username}`)
  return prefix.join(language === 'fa' ? '، ' : ', ')
}

export function resolveAppErrorMessage(error: unknown, strings: AppStrings, language: 'fa' | 'en') {
  if (error instanceof ApiError) {
    const payload = error.payload as PendingMemberErrorPayload
    const code = payload?.error?.code
    const pendingMembers = payload?.error?.details?.pending_members ?? []
    const usernames = pendingMembers
      .map((member) => member.username?.trim())
      .filter((username): username is string => Boolean(username))

    if (code === 'pending_member_invite_acceptance_required' && usernames.length > 0) {
      return strings.pendingInviteAcceptanceRequired.replace('{usernames}', formatPendingMemberNames(usernames, language))
    }
  }

  return error instanceof Error ? error.message : strings.genericError
}
