import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GroupCardsSection from '@/modules/groupCards/components/GroupCardsSection.vue'

const strings = {
  groupCardsTitle: 'Card numbers',
  groupCardsSubtitle: 'Keep each member card handy and copy it instantly.',
  addGroupCard: 'Add card number',
  editGroupCard: 'Edit card number',
  noGroupCardsTitle: 'No card numbers yet',
  noGroupCardsSubtitle: 'Add the first card number for this group.',
  cardOwnerLabel: 'Member',
  cardNumberLabel: 'Card number',
  copyCardNumber: 'Copy card number',
  cardCopied: 'Card number copied.',
  saveGroupCard: 'Save card number',
  saveGroupCardChanges: 'Save changes',
  cancel: 'Cancel',
  save: 'Save',
  edit: 'Edit',
  delete: 'Delete',
  confirmDelete: 'Confirm',
  genericError: 'Failed.',
}

describe('GroupCardsSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders empty state without affecting the dashboard contract', () => {
    const wrapper = mount(GroupCardsSection, {
      props: {
        groupId: 'group-1',
        groupCards: [],
        members: [],
        language: 'en',
        strings,
      },
    })

    expect(wrapper.text()).toContain(strings.noGroupCardsTitle)
  })

  it('renders cards and copies the canonical number', async () => {
    const wrapper = mount(GroupCardsSection, {
      props: {
        groupId: 'group-1',
        groupCards: [
          {
            id: 'card-1',
            group_id: 'group-1',
            member_id: 'member-1',
            card_number: '6037991899754321',
            user_id: 'user-1',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
            deleted_at: null,
          },
        ],
        members: [
          {
            id: 'member-1',
            group_id: 'group-1',
            username: 'amir',
            is_archived: false,
            membership_status: 'ACTIVE',
            user_id: 'user-1',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
            deleted_at: null,
          },
        ],
        language: 'en',
        strings,
      },
    })

    expect(wrapper.text()).toContain('6037 9918 9975 4321')
    await wrapper.find('button[title="Copy card number"]').trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('6037991899754321')
  })
})
