import { jwt } from '@elysiajs/jwt'
import type { PublicUser } from '@qrush/shared'
import { Elysia } from 'elysia'
import { env } from './env.ts'
import { findUserById, toPublicUser } from './store.ts'

export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: env.jwtSecret,
      exp: '30d',
    }),
  )
  .derive({ as: 'scoped' }, async ({ jwt, headers, query }) => {
    // Токен приходит в Authorization: Bearer <...>, а для WebSocket — в query.
    const header = headers.authorization
    const raw = header?.startsWith('Bearer ') ? header.slice(7) : (query as Record<string, string>)?.token
    if (!raw) return { currentUser: null as PublicUser | null }

    const payload = await jwt.verify(raw)
    if (!payload || typeof payload.sub !== 'string') return { currentUser: null as PublicUser | null }

    const row = findUserById(Number(payload.sub))
    return { currentUser: row ? toPublicUser(row) : null }
  })

export const USERNAME_PATTERN = /^[\p{L}\p{N}_\-. ]{2,24}$/u
