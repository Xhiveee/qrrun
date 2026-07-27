import type { PublicUser } from '@qrush/shared'

/** Ошибка с HTTP-статусом; превращается в JSON в глобальном onError. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function requireUser(user: PublicUser | null): PublicUser {
  if (!user) throw new HttpError(401, 'Требуется вход в аккаунт')
  return user
}

export function requireAdmin(user: PublicUser | null): PublicUser {
  const current = requireUser(user)
  if (!current.isAdmin) throw new HttpError(403, 'Доступ только для администратора')
  return current
}
