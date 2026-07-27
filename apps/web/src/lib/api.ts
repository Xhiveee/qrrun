import type {
  AdminOverview,
  AuthResponse,
  EventState,
  LeaderboardRow,
  MeResponse,
  QrCode,
  ScanResult,
} from '@qrush/shared'

const TOKEN_KEY = 'qrush.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error ?? `Ошибка ${response.status}`)
  }
  return payload as T
}

const json = (body: unknown) => JSON.stringify(body)

export interface PrintableQr extends QrCode {
  url: string
  svg: string
}

export const api = {
  register: (username: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: json({ username, password }) }),
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: json({ username, password }) }),
  me: () => request<MeResponse>('/me'),
  event: () => request<EventState>('/event'),
  leaderboard: () => request<LeaderboardRow[]>('/leaderboard'),
  scan: (code: string) => request<ScanResult>('/scan', { method: 'POST', body: json({ code }) }),

  admin: {
    overview: () => request<AdminOverview>('/admin/overview'),
    command: (command: 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'restart') =>
      request<EventState>(`/admin/event/${command}`, { method: 'POST' }),
    settings: (patch: { name?: string; tagline?: string; durationSec?: number; targetQrCount?: number }) =>
      request<EventState>('/admin/settings', { method: 'PATCH', body: json(patch) }),
    createQr: (count: number, labelPrefix: string) =>
      request<QrCode[]>('/admin/qr', { method: 'POST', body: json({ count, labelPrefix }) }),
    patchQr: (id: number, patch: { label?: string; hint?: string; active?: boolean }) =>
      request<QrCode[]>(`/admin/qr/${id}`, { method: 'PATCH', body: json(patch) }),
    deleteQr: (id: number) => request<QrCode[]>(`/admin/qr/${id}`, { method: 'DELETE' }),
    deleteAllQr: () => request<QrCode[]>('/admin/qr', { method: 'DELETE' }),
    printData: () => request<PrintableQr[]>('/admin/qr/print'),
    deleteUser: (id: number) => request<unknown>(`/admin/users/${id}`, { method: 'DELETE' }),
  },
}
