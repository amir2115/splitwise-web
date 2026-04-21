const fallbackApiBaseUrl = 'https://api.splitwise.ir/api/v1'
const fallbackAppVersionCode = 1

export function parseBooleanEnvValue(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value !== 'string') return false

  const normalized = value.trim().toLowerCase()
  if (!normalized) return false
  return normalized === 'true' || normalized === '1'
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || fallbackApiBaseUrl,
  appVersionCode: Number(import.meta.env.VITE_APP_VERSION_CODE || fallbackAppVersionCode),
  phoneVerificationRequired: parseBooleanEnvValue(import.meta.env.VITE_PHONE_VERIFICATION_REQUIRED),
}
