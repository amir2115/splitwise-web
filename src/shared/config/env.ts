const fallbackApiBaseUrl = 'https://api.splitwise.ir/api/v1'
const fallbackAppVersionCode = 1

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || fallbackApiBaseUrl,
  appVersionCode: Number(import.meta.env.VITE_APP_VERSION_CODE || fallbackAppVersionCode),
}
