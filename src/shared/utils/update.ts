import type { AppUpdateState, HealthResponse } from '@/shared/api/types'

export function resolveWebUpdateState(
  currentVersionCode: number,
  payload: HealthResponse,
  fallbackStoreUrl = '/download-app',
): AppUpdateState {
  const minSupported = payload.min_supported_version_code
  const latest = payload.latest_version_code
  const normalizedMode = payload.update_mode?.toLowerCase()
  const mode =
    minSupported !== null && currentVersionCode < minSupported
      ? 'HARD'
      : latest !== null && currentVersionCode < latest && normalizedMode === 'hard'
        ? 'HARD'
        : latest !== null && currentVersionCode < latest && normalizedMode === 'soft'
          ? 'SOFT'
          : 'NONE'

  const storeUrl = payload.store_url || fallbackStoreUrl

  return {
    mode,
    storeUrl,
    title: payload.update_title,
    message: payload.update_message,
    isVisible: mode !== 'NONE' && Boolean(storeUrl),
  }
}
