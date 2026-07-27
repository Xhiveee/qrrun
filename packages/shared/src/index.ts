export type EventStatus = 'idle' | 'running' | 'paused' | 'finished'

export interface EventState {
  name: string
  tagline: string
  status: EventStatus
  /** Планируемая длительность ивента в секундах. */
  durationSec: number
  /** Сколько QR-кодов админ планирует развесить (цель прогресса). */
  targetQrCount: number
  /** Сколько активных QR-кодов реально создано. */
  activeQrCount: number
  /** Unix ms момента старта, null если ивент ещё не стартовал. */
  startedAt: number | null
  /** Unix ms расчётного окончания с учётом пауз, null если не запущен. */
  endsAt: number | null
  /** Оставшиеся миллисекунды (0 если ивент не идёт). */
  remainingMs: number
  /** Серверное время в момент ответа — для точной синхронизации таймера. */
  serverTime: number
  participantCount: number
  totalScans: number
}

export interface LeaderboardRow {
  rank: number
  userId: number
  username: string
  score: number
  /** Unix ms последнего засчитанного скана — используется как тайбрейк. */
  lastScanAt: number | null
}

export interface PublicUser {
  id: number
  username: string
  isAdmin: boolean
}

export interface AuthResponse {
  token: string
  user: PublicUser
}

export interface QrCode {
  id: number
  token: string
  label: string
  active: boolean
  createdAt: number
  scanCount: number
}

export interface ScanRecord {
  qrId: number
  label: string
  scannedAt: number
}

export interface ScanResult {
  status: 'accepted' | 'duplicate'
  label: string
  score: number
  rank: number
  remainingQr: number
}

export interface MeResponse {
  user: PublicUser
  score: number
  rank: number
  scans: ScanRecord[]
}

export interface AdminOverview {
  event: EventState
  qrCodes: QrCode[]
  leaderboard: LeaderboardRow[]
  users: Array<PublicUser & { score: number; createdAt: number }>
}

export type ServerMessage =
  | { type: 'state'; event: EventState }
  | { type: 'leaderboard'; leaderboard: LeaderboardRow[] }
  | { type: 'scan'; username: string; label: string; score: number }

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  idle: 'ОЖИДАНИЕ',
  running: 'ИДЁТ',
  paused: 'ПАУЗА',
  finished: 'ЗАВЕРШЁН',
}

/** Символы токена QR: без 0/O/1/I/L — чтобы человек мог ввести код руками. */
export const QR_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const QR_TOKEN_LENGTH = 10

export function normalizeQrToken(raw: string): string | null {
  const trimmed = raw.trim()
  // Поддерживаем как голый токен, так и полную ссылку вида https://host/s/TOKEN
  const fromUrl = trimmed.match(/\/s\/([A-Za-z0-9]+)/)
  const candidate = (fromUrl?.[1] ?? trimmed).toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (candidate.length !== QR_TOKEN_LENGTH) return null
  for (const ch of candidate) if (!QR_ALPHABET.includes(ch)) return null
  return candidate
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
