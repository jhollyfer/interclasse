import { vine, notNull, email, password } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * The account itself, edited by its owner.
 *
 * **Every field is optional**: an absent field means "leave alone", not
 * "erase". `backend-old` used `PATCH` with a schema that required `name`,
 * `email`, `role` and `avatarId` - the verb promised partial and the schema refused
 * partial.
 *
 * `role` and `status` are not here: the role is set on creation, by the
 * administrator, and nobody changes their own. Declaring them just to ignore them later
 * would invite someone to try.
 */
export const AccountProfileUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional().use(notNull()),
  email: email().optional().use(notNull()),
  password: password().optional().use(notNull()),
  /**
   * The current password, required **only** when `password` comes in the payload.
   *
   * It is proof of identity, not of strength: whoever hijacks a session has the
   * cookie, but does not know the password. `PASSWORD_SAME_AS_CURRENT` does not serve
   * that - it compares the new one with the hash, and getting past it is precisely not
   * knowing the current one.
   *
   * `requiredIfExists` and not a check in the use case: conditional
   * requiredness is payload shape, and here it becomes a `422` pointing at the field -
   * which is what `backend-old` answered as a generic error
   * (`profile/use-cases/update.use-case.ts:22`).
   *
   * Without the strength rules of `password()`: the value is checked against the hash,
   * not saved. The ceiling of 32 is the same as the policy's, because it is the largest value
   * the application may already have saved.
   */
  currentPassword: vine.string().maxLength(32).optional().requiredIfExists('password'),
  // `nullable` is what lets the photo be removed without replacing it. The uuid only guarantees the
  // format; that the file exists is checked in the use case, otherwise the foreign
  // key violation would blow up as a 500 instead of a 422.
  avatarId: vine.string().uuid().nullable().optional(),
})

export type AccountProfileUpdatePayload = Infer<typeof AccountProfileUpdateValidator>
