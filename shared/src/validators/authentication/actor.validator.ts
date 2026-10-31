import { USER_ROLES } from '../../enums/user-role.js'
import { z } from '../../validator.js'

/**
 * Who acts, as the use case knows them: the id, the role and the avatar, and nothing
 * from the ORM model (`_standards/backend.md` §4.3). The authentication middleware
 * validates the session account against this schema and leaves the result in
 * `ctx.actor`; the controller only passes it on.
 *
 * The avatar comes along because it is the only ownership the file download policy
 * resolves without a query (`app/policies/storage.policy.ts`).
 */
export const ActorSchema = z.object({
  id: z.string(),
  role: z.enum(USER_ROLES),
  avatarId: z.string().nullable(),
})

export type Actor = z.infer<typeof ActorSchema>
