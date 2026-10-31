import { USER_ROLES, USER_SORT_COLUMNS } from '@interclasse/shared'

import {
  vine,
  notNull,
  email,
  password,
  activeStatus,
  paginationFields,
  trashedField,
  sortFields,
} from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * The role of a user managed by the panel.
 *
 * The whole enum, no cut: the three roles are born through the panel, and purge stays
 * with `ADMINISTRATOR`. There is no role to exclude from the list.
 */
export function manageableRole() {
  return vine.enum(USER_ROLES)
}

/**
 * What `POST /administrator/users` receives.
 *
 * `role` is **required**: the column has no `DEFAULT`, and the role is always
 * explicit. `backend-old` fell back to `ADMINISTRATOR` by omission, and a forgotten
 * creation path silently wrote the most powerful role.
 *
 * `password` goes through the shared strength rule, which also requires
 * `passwordConfirmation` with the same value - the field is read from the raw input and does not
 * enter the validated payload, so there is nothing to discard before `merge()`.
 *
 * `status` is optional because the column has `DEFAULT 'ACTIVE'`: the account is born
 * able to sign in, and deactivating is an edit.
 */
export const AdministratorUserCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  email: email(),
  password: password(),
  role: manageableRole(),
  status: activeStatus().optional(),
  // `nullable` is what lets the photo be removed without replacing it. The uuid only guarantees the
  // format; that the file exists is checked in the use case, otherwise the foreign
  // key violation would blow up as a `500` instead of a `422`.
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * What `PUT /administrator/users/:id` receives.
 *
 * **Every field is optional**, including the ones required on creation: an absent
 * field means "leave alone", not "erase". Only `avatarId` accepts an
 * explicit `null`.
 *
 * `role` is in here, unlike `ProfileUpdateValidator`: promoting and
 * demoting is what this resource exists to do, and nobody changes their own
 * role through `/account`.
 */
export const AdministratorUserUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional().use(notNull()),
  email: email().optional().use(notNull()),
  password: password().optional().use(notNull()),
  role: manageableRole().optional().use(notNull()),
  status: activeStatus().optional().use(notNull()),
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * What `GET /administrator/users` accepts in the query.
 *
 * Two filters of its own, which are the screen's two cuts: `role` separates who
 * administers from who edits, and `status` separates who can sign in from who was deactivated
 * without being archived.
 */
export const AdministratorUserPaginateValidator = vine.create({
  ...paginationFields(),
  ...trashedField(),
  ...sortFields(USER_SORT_COLUMNS),
  role: manageableRole().optional(),
  status: activeStatus().optional(),
})

export type AdministratorUserCreatePayload = Infer<typeof AdministratorUserCreateValidator>

export type AdministratorUserUpdatePayload = Infer<typeof AdministratorUserUpdateValidator>

export type AdministratorUserPaginatePayload = Infer<typeof AdministratorUserPaginateValidator>
