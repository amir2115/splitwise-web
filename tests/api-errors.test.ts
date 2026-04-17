import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/client'
import { stringsFor } from '@/shared/i18n/strings'
import { resolveAppErrorMessage } from '@/shared/utils/apiErrors'

describe('resolveAppErrorMessage', () => {
  it('renders a localized pending-invite member error with usernames', () => {
    const error = new ApiError('Members must accept the group invite before this action: alice', 400, {
      error: {
        code: 'pending_member_invite_acceptance_required',
        details: {
          pending_members: [{ member_id: 'member-1', username: 'alice' }],
        },
      },
    })

    const message = resolveAppErrorMessage(error, stringsFor('fa'), 'fa')

    expect(message).toContain('@alice')
    expect(message).toContain('دعوت گروه را بپذیرند')
  })
})
