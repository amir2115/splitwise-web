import { ApiClient } from '@/shared/api/client'
import type { AppDownloadContent } from '@/shared/api/types'

const publicApiClient = new ApiClient({
  getAccessToken: () => null,
  getRefreshToken: () => null,
  onTokens: () => {},
  onUnauthorized: () => {},
})

export function fetchAppDownloadContent() {
  return publicApiClient.get<AppDownloadContent>('/app-download')
}
