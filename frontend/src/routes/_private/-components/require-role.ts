import type { UserRole } from '@interclasse/shared'
import { redirect } from '@tanstack/react-router'

import { HOME_BY_ROLE } from './menu'

/**
 * Sends to their own home screen whoever opened another role's area.
 *
 * It is not authorization - that belongs to the backend, which answers 403 anyway.
 * It is screen: without this, the administrator who opened `/representative` saw "Não foi
 * possível carregar a lista agora", an error that does not exist.
 */
export function requireRole(
  role: UserRole,
  allowed: ReadonlyArray<UserRole>,
): void {
  if (allowed.includes(role)) return

  throw redirect({ to: HOME_BY_ROLE[role] })
}
