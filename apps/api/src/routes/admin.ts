import type { AdminOverview } from '@qrush/shared'
import { Elysia, t } from 'elysia'
import { authPlugin } from '../auth.ts'
import { requireAdmin } from '../http.ts'
import { qrSvgBatch, qrUrl } from '../qr.ts'
import { broadcastAll } from '../realtime.ts'
import {
  type EventCommand,
  applyEventCommand,
  createQrCodes,
  deleteAllQrCodes,
  deleteQrCode,
  deleteUser,
  getEventState,
  getLeaderboard,
  listQrCodes,
  listUsers,
  updateEventSettings,
  updateQrCode,
} from '../store.ts'

const overview = (): AdminOverview => ({
  event: getEventState(),
  qrCodes: listQrCodes(),
  leaderboard: getLeaderboard(),
  users: listUsers(),
})

export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  .use(authPlugin)
  .onBeforeHandle(({ currentUser }) => {
    requireAdmin(currentUser)
  })
  .get('/overview', () => overview())
  .post(
    '/event/:command',
    ({ params }) => {
      const command = params.command as EventCommand
      const state = applyEventCommand(command)
      broadcastAll()
      return state
    },
    {
      params: t.Object({
        command: t.Union([
          t.Literal('start'),
          t.Literal('pause'),
          t.Literal('resume'),
          t.Literal('stop'),
          t.Literal('reset'),
          t.Literal('restart'),
        ]),
      }),
    },
  )
  .patch(
    '/settings',
    ({ body }) => {
      const state = updateEventSettings(body)
      broadcastAll()
      return state
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ maxLength: 40 })),
        tagline: t.Optional(t.String({ maxLength: 60 })),
        durationSec: t.Optional(t.Number({ minimum: 30, maximum: 24 * 3600 })),
        targetQrCount: t.Optional(t.Number({ minimum: 1, maximum: 2000 })),
      }),
    },
  )
  .get('/qr', () => listQrCodes())
  .post(
    '/qr',
    ({ body }) => {
      const created = createQrCodes(body.count, body.labelPrefix ?? 'ТОЧКА')
      broadcastAll()
      return created
    },
    { body: t.Object({ count: t.Number({ minimum: 1, maximum: 500 }), labelPrefix: t.Optional(t.String({ maxLength: 40 })) }) },
  )
  .patch(
    '/qr/:id',
    ({ params, body }) => {
      updateQrCode(params.id, body)
      broadcastAll()
      return listQrCodes()
    },
    {
      params: t.Object({ id: t.Number({ minimum: 1 }) }),
      body: t.Object({
        label: t.Optional(t.String({ maxLength: 80 })),
        active: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete(
    '/qr/:id',
    ({ params }) => {
      deleteQrCode(params.id)
      broadcastAll()
      return listQrCodes()
    },
    { params: t.Object({ id: t.Number({ minimum: 1 }) }) },
  )
  .delete('/qr', () => {
    deleteAllQrCodes()
    broadcastAll()
    return listQrCodes()
  })
  /** Готовые SVG для печати: без растровых изображений, масштабируются в любой формат. */
  .get('/qr/print', async () => {
    const codes = listQrCodes()
    const svgs = await qrSvgBatch(codes.map((c) => c.token))
    return codes.map((code) => ({ ...code, url: qrUrl(code.token), svg: svgs[code.token]! }))
  })
  .get('/users', () => listUsers())
  .delete(
    '/users/:id',
    ({ params }) => {
      deleteUser(params.id)
      broadcastAll()
      return listUsers()
    },
    { params: t.Object({ id: t.Number({ minimum: 1 }) }) },
  )
