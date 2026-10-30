import { USER_ROLES } from '../../enums/user-role.js'
import { z } from '../../validator.js'

/**
 * Quem age, como o use-case o conhece: o id, o papel e o avatar, e nada do model
 * do ORM (`_standards/backend.md` §4.3). O middleware de autenticação valida a
 * conta da sessão contra este schema e deixa o resultado em `ctx.actor`; o
 * controller só o repassa.
 *
 * O avatar vai junto porque é a única posse que a policy de download de arquivo
 * resolve sem consulta (`app/policies/storage.policy.ts`).
 */
export const ActorSchema = z.object({
  id: z.string(),
  role: z.enum(USER_ROLES),
  avatarId: z.string().nullable(),
})

export type Actor = z.infer<typeof ActorSchema>
