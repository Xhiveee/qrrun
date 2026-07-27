import { fileURLToPath } from 'node:url'

const isProd = process.env.NODE_ENV === 'production'

const resolveFromHere = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) throw new Error(`Отсутствует обязательная переменная окружения ${name}`)
  return value
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/+$/, ''),
  databasePath: process.env.DATABASE_PATH ?? resolveFromHere('../../../data/qrush.sqlite'),
  jwtSecret: required('JWT_SECRET', isProd ? undefined : 'dev-secret-not-for-production'),
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  adminPassword: required('ADMIN_PASSWORD', isProd ? undefined : 'admin'),
  /** Каталог со сборкой фронтенда; в продакшне API отдаёт SPA сам. */
  webDist: process.env.WEB_DIST ?? resolveFromHere('../../web/dist'),
}

if (isProd && env.jwtSecret.length < 24) {
  throw new Error('JWT_SECRET должен быть длиной минимум 24 символа в продакшене')
}
