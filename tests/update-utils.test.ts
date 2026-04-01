import { describe, expect, it } from 'vitest'
import { resolveWebUpdateState } from '@/shared/utils/update'

describe('resolveWebUpdateState', () => {
  it('forces a hard update below the minimum supported version', () => {
    const state = resolveWebUpdateState(2, {
      status: 'ok',
      min_supported_version_code: 3,
      latest_version_code: 5,
      update_mode: 'soft',
      store_url: 'https://splitwise.ir/download-app',
      update_title: 'Update required',
      update_message: 'Please update.',
    })

    expect(state.mode).toBe('HARD')
    expect(state.isVisible).toBe(true)
  })

  it('shows a soft update when a newer version exists', () => {
    const state = resolveWebUpdateState(3, {
      status: 'ok',
      min_supported_version_code: 1,
      latest_version_code: 4,
      update_mode: 'soft',
      store_url: null,
      update_title: null,
      update_message: null,
    })

    expect(state.mode).toBe('SOFT')
    expect(state.storeUrl).toBe('/download-app')
    expect(state.isVisible).toBe(true)
  })

  it('stays hidden when no update is needed', () => {
    const state = resolveWebUpdateState(4, {
      status: 'ok',
      min_supported_version_code: 1,
      latest_version_code: 4,
      update_mode: 'soft',
      store_url: null,
      update_title: null,
      update_message: null,
    })

    expect(state.mode).toBe('NONE')
    expect(state.isVisible).toBe(false)
  })
})
