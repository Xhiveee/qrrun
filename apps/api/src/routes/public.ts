import type { AuthResponse, MeResponse, ScanResult } from '@qrush/shared'
import { normalizeQrToken } from '@qrush/shared'
import { Elysia, t } from 'elysia'
import { USERNAME_PATTERN, authPlugin } from '../auth.ts'
import { HttpError, requireUser } from '../http.ts'
import { broadcastAll } from '../realtime.ts'
import {
  createUser,
  findUserByName,
  getEventState,
  getLeaderboard,
  getRank,
  getScans,
  getScore,
  registerScan,
  toPublicUser,
} from '../store.ts'

/** Простейший лимитер: не более 40 попыток сканирования в минуту на пользователя. */
const scanHits = new Map<number, number[]>()

function rateLimit(userId: number): void {
  const now = Date.now()
  const hits = (scanHits.get(userId) ?? []).filter((ts) => now - ts < 60_000)
  if (hits.length >= 40) throw new HttpError(429, 'Слишком много попыток, подожди немного')
  hits.push(now)
  scanHits.set(userId, hits)
}

export const publicRoutes = new Elysia({ prefix: '/api' })
  .use(authPlugin)
  .post(
    '/auth/register',
    async ({ body, jwt }): Promise<AuthResponse> => {
      const username = body.username.trim()
      if (!USERNAME_PATTERN.test(username))
        throw new HttpError(400, 'Ник: 2–24 символа, буквы, цифры, пробел, _ - .')
      if (body.password.length < 6) throw new HttpError(400, 'Пароль минимум 6 символов')
      if (findUserByName(username)) throw new HttpError(409, 'Такой ник уже занят')

      const user = await createUser(username, body.password)
      broadcastAll()
      return { token: await jwt.sign({ sub: String(user.id) }), user: toPublicUser(user) }
    },
    { body: t.Object({ username: t.String({ minLength: 2, maxLength: 24 }), password: t.String({ minLength: 6, maxLength: 128 }) }) },
  )
  .post(
    '/auth/login',
    async ({ body, jwt }): Promise<AuthResponse> => {
      const row = findUserByName(body.username)
      if (!row || !(await Bun.password.verify(body.password, row.password_hash)))
        throw new HttpError(401, 'Неверный ник или пароль')
      return { token: await jwt.sign({ sub: String(row.id) }), user: toPublicUser(row) }
    },
    { body: t.Object({ username: t.String({ minLength: 2, maxLength: 24 }), password: t.String({ minLength: 6, maxLength: 128 }) }) },
  )
  .get('/me', ({ currentUser }): MeResponse => {
    const user = requireUser(currentUser)
    return { user, score: getScore(user.id), rank: getRank(user.id), scans: getScans(user.id) }
  })
  .get('/event', () => getEventState())
  .get('/leaderboard', () => getLeaderboard())
  .post(
    '/scan',
    ({ body, currentUser }): ScanResult => {
      const user = requireUser(currentUser)
      rateLimit(user.id)

      const token = normalizeQrToken(body.code)
      if (!token) throw new HttpError(400, 'Не похоже на код QRUSH')

      const outcome = registerScan(user.id, token)
      if (!outcome.ok) {
        const messages = {
          not_running: 'Ивент сейчас не идёт — скан не засчитан',
          unknown_code: 'Такого кода не существует',
          inactive_code: 'Этот код отключён администратором',
        } as const
        throw new HttpError(outcome.reason === 'not_running' ? 409 : 404, messages[outcome.reason])
      }

      if (!outcome.duplicate) broadcastAll()

      return {
        status: outcome.duplicate ? 'duplicate' : 'accepted',
        label: outcome.label,
        hint: outcome.hint,
        score: outcome.score,
        rank: outcome.rank,
        remainingQr: outcome.remainingQr,
      }
    },
    { body: t.Object({ code: t.String({ maxLength: 256 }) }) },
  )
