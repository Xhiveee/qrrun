import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { join, normalize } from 'node:path'
import { env } from './env.ts'
import { HttpError } from './http.ts'
import { addClient, broadcastAll, removeClient, startTicker } from './realtime.ts'
import { adminRoutes } from './routes/admin.ts'
import { publicRoutes } from './routes/public.ts'
import { createUser, findUserByName, getEventState, getLeaderboard } from './store.ts'

/* Учётка администратора создаётся один раз при первом запуске. */
if (!findUserByName(env.adminUsername)) {
  await createUser(env.adminUsername, env.adminPassword, true)
  console.log(`[qrush] создан администратор «${env.adminUsername}»`)
}

async function serveSpa(pathname: string): Promise<Response> {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\\/])+/, '').replace(/^[\\/]+/, '')
  const asset = Bun.file(join(env.webDist, relative))
  if (relative && (await asset.exists())) return new Response(asset)

  const index = Bun.file(join(env.webDist, 'index.html'))
  if (await index.exists())
    return new Response(index, { headers: { 'content-type': 'text/html; charset=utf-8' } })

  return new Response('Фронтенд не собран. Запусти `bun run build`.', { status: 503 })
}

export const app = new Elysia()
  .use(cors({ origin: true, credentials: true }))
  .onError(({ error, code, set }) => {
    if (error instanceof HttpError) {
      set.status = error.status
      return { error: error.message }
    }
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Некорректные данные запроса' }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Не найдено' }
    }
    console.error('[qrush]', error)
    set.status = 500
    return { error: 'Внутренняя ошибка сервера' }
  })
  .get('/healthz', () => ({ ok: true, uptime: process.uptime() }))
  .use(publicRoutes)
  .use(adminRoutes)
  .ws('/ws', {
    open(ws) {
      addClient(ws)
      ws.send(JSON.stringify({ type: 'state', event: getEventState() }))
      ws.send(JSON.stringify({ type: 'leaderboard', leaderboard: getLeaderboard() }))
    },
    close(ws) {
      removeClient(ws)
    },
    message(ws, message) {
      if (message === 'ping') ws.send('pong')
    },
  })
  .get('/*', ({ request }) => serveSpa(new URL(request.url).pathname))
  .listen(env.port)

startTicker()
broadcastAll()

console.log(`[qrush] API на http://localhost:${env.port} · публичный адрес ${env.publicUrl}`)
