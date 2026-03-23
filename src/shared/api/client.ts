import { env } from '@/shared/config/env'
import { readAccessToken, readRefreshToken } from '@/shared/utils/storage'

export interface ApiClientDependencies {
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  onTokens: (tokens: { access_token: string; refresh_token: string }) => void
  onUnauthorized: () => void
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export class ApiClient {
  private refreshPromise: Promise<boolean> | null = null

  constructor(private dependencies: ApiClientDependencies) {}

  async get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' })
  }

  async post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body })
  }

  async patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body })
  }

  async delete(path: string) {
    await this.request(path, { method: 'DELETE' })
  }

  async request<T>(path: string, init: { method: string; body?: unknown }, allowRetry = true): Promise<T> {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    const token = this.dependencies.getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })

    if (response.status === 401 && allowRetry && this.dependencies.getRefreshToken()) {
      const refreshed = await this.refresh()
      if (refreshed) return this.request<T>(path, init, false)
    }

    if (!response.ok) {
      const payload = await parseJson(response)
      throw new ApiError(readErrorMessage(payload), response.status, payload)
    }

    if (response.status === 204) return undefined as T
    return parseJson(response) as Promise<T>
  }

  private async refresh() {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const refreshToken = this.dependencies.getRefreshToken()
        if (!refreshToken) return false

        const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (!response.ok) {
          this.dependencies.onUnauthorized()
          return false
        }

        const payload = (await response.json()) as { access_token: string; refresh_token: string }
        this.dependencies.onTokens(payload)
        return true
      })().finally(() => {
        this.refreshPromise = null
      })
    }

    return this.refreshPromise
  }
}

async function parseJson(response: Response) {
  const text = await response.text()
  if (!text) return null
  return JSON.parse(text)
}

function readErrorMessage(payload: unknown) {
  if (typeof payload === 'string') return payload
  if (payload && typeof payload === 'object') {
    const error = (payload as { error?: { message?: unknown } }).error
    if (typeof error?.message === 'string') return error.message
    const detail = (payload as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : 'Validation error'))
        .join(', ')
    }
  }
  return 'Request failed'
}

export const fallbackAuthSnapshot = {
  accessToken: readAccessToken,
  refreshToken: readRefreshToken,
}
