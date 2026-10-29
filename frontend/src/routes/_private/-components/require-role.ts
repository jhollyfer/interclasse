import { redirect } from '@tanstack/react-router'
import type { UserRole } from '@interclasse/shared'

import { HOME_BY_ROLE } from './menu'

/**
 * Manda para a própria tela inicial quem abriu a área de outro papel.
 *
 * Não é autorização - essa é do backend, que responde 403 de qualquer jeito.
 * É tela: sem isto, o administrador que abria `/representative` via "Não foi
 * possível carregar a lista agora", um erro que não existe.
 */
export function requireRole(
  role: UserRole,
  allowed: ReadonlyArray<UserRole>,
): void {
  if (allowed.includes(role)) return

  throw redirect({ to: HOME_BY_ROLE[role] })
}
