import type { AppLanguage, ThemeMode, User } from '@/shared/api/types'

const KEYS = {
  accessToken: 'offline-splitwise.accessToken',
  refreshToken: 'offline-splitwise.refreshToken',
  user: 'offline-splitwise.user',
  guestMode: 'offline-splitwise.guestMode',
  language: 'offline-splitwise.language',
  themeMode: 'offline-splitwise.themeMode',
  installPromptDismissedAt: 'offline-splitwise.installPromptDismissedAt',
}

const safeStorage = () => window.localStorage

export function readAccessToken() {
  return safeStorage().getItem(KEYS.accessToken)
}

export function writeAccessToken(token: string | null) {
  if (token) {
    safeStorage().setItem(KEYS.accessToken, token)
  } else {
    safeStorage().removeItem(KEYS.accessToken)
  }
}

export function readRefreshToken() {
  return safeStorage().getItem(KEYS.refreshToken)
}

export function writeRefreshToken(token: string | null) {
  if (token) {
    safeStorage().setItem(KEYS.refreshToken, token)
  } else {
    safeStorage().removeItem(KEYS.refreshToken)
  }
}

export function readStoredUser(): User | null {
  const raw = safeStorage().getItem(KEYS.user)
  if (!raw) return null

  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function writeStoredUser(user: User | null) {
  if (user) {
    safeStorage().setItem(KEYS.user, JSON.stringify(user))
  } else {
    safeStorage().removeItem(KEYS.user)
  }
}

export function readGuestMode() {
  return safeStorage().getItem(KEYS.guestMode) === '1'
}

export function writeGuestMode(value: boolean) {
  if (value) {
    safeStorage().setItem(KEYS.guestMode, '1')
  } else {
    safeStorage().removeItem(KEYS.guestMode)
  }
}

export function readLanguage(): AppLanguage {
  const value = safeStorage().getItem(KEYS.language)
  return value === 'en' ? 'en' : 'fa'
}

export function writeLanguage(language: AppLanguage) {
  safeStorage().setItem(KEYS.language, language)
}

export function readThemeMode(): ThemeMode {
  const value = safeStorage().getItem(KEYS.themeMode)
  return value === 'light' ? 'light' : 'dark'
}

export function writeThemeMode(themeMode: ThemeMode) {
  safeStorage().setItem(KEYS.themeMode, themeMode)
}

export function clearAuthStorage() {
  writeAccessToken(null)
  writeRefreshToken(null)
  writeStoredUser(null)
  writeGuestMode(false)
}

export function readInstallPromptDismissedAt() {
  const raw = safeStorage().getItem(KEYS.installPromptDismissedAt)
  return raw ? Number.parseInt(raw, 10) : 0
}

export function writeInstallPromptDismissedAt(value: number) {
  safeStorage().setItem(KEYS.installPromptDismissedAt, String(value))
}
