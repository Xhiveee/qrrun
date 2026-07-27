import type {
  EventState,
  EventStatus,
  LeaderboardRow,
  PublicUser,
  QrCode,
  ScanRecord,
} from '@qrush/shared'
import { QR_ALPHABET, QR_TOKEN_LENGTH } from '@qrush/shared'
import { db } from './db.ts'

interface EventRow {
  name: string
  tagline: string
  status: EventStatus
  duration_sec: number
  target_qr_count: number
  started_at: number | null
  paused_at: number | null
  paused_ms: number
}

interface UserRow {
  id: number
  username: string
  password_hash: string
  is_admin: number
  created_at: number
}

const selectEvent = db.query('SELECT * FROM event_state WHERE id = 1')
const countActiveQr = db.query('SELECT COUNT(*) AS n FROM qr_codes WHERE active = 1')
const countUsers = db.query('SELECT COUNT(*) AS n FROM users WHERE is_admin = 0')
const countScans = db.query('SELECT COUNT(*) AS n FROM scans')

const scalar = (row: unknown) => (row as { n: number } | null)?.n ?? 0

/* ------------------------------------------------------------------ event */

export function readEventRow(): EventRow {
  return selectEvent.get() as EventRow
}

/** Сколько миллисекунд ивент реально шёл (без учёта пауз). */
function elapsedMs(row: EventRow, now: number): number {
  if (!row.started_at) return 0
  const reference = row.status === 'paused' && row.paused_at ? row.paused_at : now
  return Math.max(0, reference - row.started_at - row.paused_ms)
}

export function getEventState(now = Date.now()): EventState {
  const row = readEventRow()
  const totalMs = row.duration_sec * 1000
  const isLive = row.status === 'running' || row.status === 'paused'
  const remainingMs = isLive ? Math.max(0, totalMs - elapsedMs(row, now)) : 0

  return {
    name: row.name,
    tagline: row.tagline,
    status: row.status,
    durationSec: row.duration_sec,
    targetQrCount: row.target_qr_count,
    activeQrCount: scalar(countActiveQr.get()),
    startedAt: row.started_at,
    endsAt: row.status === 'running' && row.started_at ? row.started_at + row.paused_ms + totalMs : null,
    remainingMs,
    serverTime: now,
    participantCount: scalar(countUsers.get()),
    totalScans: scalar(countScans.get()),
  }
}

/** Переводит ивент в finished, если время вышло. Возвращает true при смене статуса. */
export function expireEventIfNeeded(now = Date.now()): boolean {
  const row = readEventRow()
  if (row.status !== 'running') return false
  if (elapsedMs(row, now) < row.duration_sec * 1000) return false
  db.query("UPDATE event_state SET status = 'finished', paused_at = NULL WHERE id = 1").run()
  return true
}

export type EventCommand = 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'restart'

export function applyEventCommand(command: EventCommand): EventState {
  const now = Date.now()
  const row = readEventRow()

  switch (command) {
    case 'start':
      if (row.status === 'running') break
      if (row.status === 'paused') return applyEventCommand('resume')
      db.query(
        "UPDATE event_state SET status = 'running', started_at = ?, paused_at = NULL, paused_ms = 0 WHERE id = 1",
      ).run(now)
      break

    case 'pause':
      if (row.status !== 'running') break
      db.query("UPDATE event_state SET status = 'paused', paused_at = ? WHERE id = 1").run(now)
      break

    case 'resume': {
      if (row.status !== 'paused' || !row.paused_at) break
      const extraPause = now - row.paused_at
      db.query(
        "UPDATE event_state SET status = 'running', paused_at = NULL, paused_ms = paused_ms + ? WHERE id = 1",
      ).run(extraPause)
      break
    }

    case 'stop':
      db.query("UPDATE event_state SET status = 'finished', paused_at = NULL WHERE id = 1").run()
      break

    case 'reset':
      // Полный сброс прогресса: очки обнуляются, QR-коды и участники остаются.
      db.query('DELETE FROM scans').run()
      db.query(
        "UPDATE event_state SET status = 'idle', started_at = NULL, paused_at = NULL, paused_ms = 0 WHERE id = 1",
      ).run()
      break

    case 'restart':
      db.query('DELETE FROM scans').run()
      db.query(
        "UPDATE event_state SET status = 'running', started_at = ?, paused_at = NULL, paused_ms = 0 WHERE id = 1",
      ).run(now)
      break
  }

  return getEventState()
}

export interface EventSettingsPatch {
  name?: string
  tagline?: string
  durationSec?: number
  targetQrCount?: number
}

export function updateEventSettings(patch: EventSettingsPatch): EventState {
  const row = readEventRow()
  db.query(
    'UPDATE event_state SET name = ?, tagline = ?, duration_sec = ?, target_qr_count = ? WHERE id = 1',
  ).run(
    patch.name?.trim() || row.name,
    patch.tagline?.trim() ?? row.tagline,
    Math.max(30, Math.min(24 * 3600, Math.round(patch.durationSec ?? row.duration_sec))),
    Math.max(1, Math.min(2000, Math.round(patch.targetQrCount ?? row.target_qr_count))),
  )
  return getEventState()
}

/* ------------------------------------------------------------------- users */

export function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, username: row.username, isAdmin: row.is_admin === 1 }
}

export function findUserByName(username: string): UserRow | null {
  return db
    .query('SELECT * FROM users WHERE username_lower = ?')
    .get(username.trim().toLowerCase()) as UserRow | null
}

export function findUserById(id: number): UserRow | null {
  return db.query('SELECT * FROM users WHERE id = ?').get(id) as UserRow | null
}

export async function createUser(username: string, password: string, isAdmin = false): Promise<UserRow> {
  const clean = username.trim()
  const hash = await Bun.password.hash(password, { algorithm: 'argon2id' })
  const { lastInsertRowid } = db
    .query(
      'INSERT INTO users (username, username_lower, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(clean, clean.toLowerCase(), hash, isAdmin ? 1 : 0, Date.now())
  return findUserById(Number(lastInsertRowid))!
}

export function deleteUser(id: number): void {
  db.query('DELETE FROM users WHERE id = ? AND is_admin = 0').run(id)
}

export function listUsers(): Array<PublicUser & { score: number; createdAt: number }> {
  const rows = db
    .query(
      `SELECT u.id, u.username, u.is_admin, u.created_at,
              (SELECT COUNT(*) FROM scans s WHERE s.user_id = u.id) AS score
       FROM users u
       ORDER BY u.created_at DESC`,
    )
    .all() as Array<{ id: number; username: string; is_admin: number; created_at: number; score: number }>

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    isAdmin: r.is_admin === 1,
    score: r.score,
    createdAt: r.created_at,
  }))
}

/* --------------------------------------------------------------- qr codes */

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(QR_TOKEN_LENGTH))
  let out = ''
  for (const byte of bytes) out += QR_ALPHABET[byte % QR_ALPHABET.length]
  return out
}

export function createQrCodes(count: number, labelPrefix: string): QrCode[] {
  const total = Math.max(1, Math.min(500, Math.round(count)))
  const existing = scalar(db.query('SELECT COUNT(*) AS n FROM qr_codes').get())
  const insert = db.query(
    'INSERT INTO qr_codes (token, label, active, created_at) VALUES (?, ?, 1, ?) RETURNING id',
  )

  const created: number[] = []
  db.transaction(() => {
    for (let i = 0; i < total; i++) {
      let token = randomToken()
      // Коллизия практически невозможна, но UNIQUE-нарушение ронять запрос не должно.
      while (db.query('SELECT 1 FROM qr_codes WHERE token = ?').get(token)) token = randomToken()
      const row = insert.get(token, `${labelPrefix.trim() || 'ТОЧКА'} ${existing + i + 1}`, Date.now()) as {
        id: number
      }
      created.push(row.id)
    }
  })()

  return listQrCodes().filter((qr) => created.includes(qr.id))
}

export function listQrCodes(): QrCode[] {
  const rows = db
    .query(
      `SELECT q.id, q.token, q.label, q.active, q.created_at,
              (SELECT COUNT(*) FROM scans s WHERE s.qr_id = q.id) AS scan_count
       FROM qr_codes q
       ORDER BY q.id ASC`,
    )
    .all() as Array<{
    id: number
    token: string
    label: string
    active: number
    created_at: number
    scan_count: number
  }>

  return rows.map((r) => ({
    id: r.id,
    token: r.token,
    label: r.label,
    active: r.active === 1,
    createdAt: r.created_at,
    scanCount: r.scan_count,
  }))
}

export function updateQrCode(id: number, patch: { label?: string; active?: boolean }): void {
  const current = db.query('SELECT label, active FROM qr_codes WHERE id = ?').get(id) as
    | { label: string; active: number }
    | null
  if (!current) return
  db.query('UPDATE qr_codes SET label = ?, active = ? WHERE id = ?').run(
    patch.label?.trim() || current.label,
    patch.active === undefined ? current.active : patch.active ? 1 : 0,
    id,
  )
}

export function deleteQrCode(id: number): void {
  db.query('DELETE FROM qr_codes WHERE id = ?').run(id)
}

export function deleteAllQrCodes(): void {
  db.query('DELETE FROM qr_codes').run()
}

/* ------------------------------------------------------------------ scans */

export type ScanOutcome =
  | { ok: true; duplicate: boolean; label: string; score: number; rank: number; remainingQr: number }
  | { ok: false; reason: 'not_running' | 'unknown_code' | 'inactive_code' }

export function registerScan(userId: number, token: string): ScanOutcome {
  expireEventIfNeeded()
  const event = readEventRow()
  if (event.status !== 'running') return { ok: false, reason: 'not_running' }

  const qr = db.query('SELECT id, label, active FROM qr_codes WHERE token = ?').get(token) as
    | { id: number; label: string; active: number }
    | null
  if (!qr) return { ok: false, reason: 'unknown_code' }
  if (qr.active !== 1) return { ok: false, reason: 'inactive_code' }

  const inserted = db
    .query('INSERT OR IGNORE INTO scans (user_id, qr_id, created_at) VALUES (?, ?, ?)')
    .run(userId, qr.id, Date.now())

  const score = getScore(userId)
  const remainingQr = Math.max(0, scalar(countActiveQr.get()) - score)

  return {
    ok: true,
    duplicate: inserted.changes === 0,
    label: qr.label,
    score,
    rank: getRank(userId),
    remainingQr,
  }
}

export function getScore(userId: number): number {
  return scalar(db.query('SELECT COUNT(*) AS n FROM scans WHERE user_id = ?').get(userId))
}

export function getScans(userId: number): ScanRecord[] {
  const rows = db
    .query(
      `SELECT q.id AS qr_id, q.label, s.created_at
       FROM scans s JOIN qr_codes q ON q.id = s.qr_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
    )
    .all(userId) as Array<{ qr_id: number; label: string; created_at: number }>
  return rows.map((r) => ({ qrId: r.qr_id, label: r.label, scannedAt: r.created_at }))
}

export function getLeaderboard(limit = 100): LeaderboardRow[] {
  const rows = db
    .query(
      `SELECT u.id, u.username,
              COUNT(s.id)     AS score,
              MAX(s.created_at) AS last_scan_at
       FROM users u
       LEFT JOIN scans s ON s.user_id = u.id
       WHERE u.is_admin = 0
       GROUP BY u.id
       HAVING score > 0
       ORDER BY score DESC, last_scan_at ASC
       LIMIT ?`,
    )
    .all(limit) as Array<{ id: number; username: string; score: number; last_scan_at: number | null }>

  return rows.map((r, index) => ({
    rank: index + 1,
    userId: r.id,
    username: r.username,
    score: r.score,
    lastScanAt: r.last_scan_at,
  }))
}

export function getRank(userId: number): number {
  const found = getLeaderboard(10_000).find((row) => row.userId === userId)
  return found?.rank ?? 0
}
