import type { UserRole } from '../enums/user-role.js'

/**
 * Quem age, como o use-case o conhece: o id e o papel, e nada do model do ORM
 * (`_standards/backend.md` §4.3). O `User` da sessão satisfaz este tipo, então o
 * controller repassa a conta autenticada sem converter.
 */
export type Actor = {
  readonly id: string
  readonly role: UserRole
}
