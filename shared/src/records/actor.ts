import type { UserRole } from '../enums/user-role.js'

/**
 * Quem age na requisição, como o use-case o recebe (`_standards/backend.md`
 * §4.3). Só o que a regra lê: o use-case não importa o model do ORM, e o
 * usuário da sessão satisfaz este tipo pela forma.
 */
export type Actor = {
  readonly id: string
  readonly role: UserRole
}
