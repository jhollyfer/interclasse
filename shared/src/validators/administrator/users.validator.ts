import { ACTIVE_STATUSES } from '../../enums/active-status.js'
import { TRASHED_MODES } from '../../enums/trashed-mode.js'
import { USER_ROLES } from '../../enums/user-role.js'
import {
  emailField,
  paginationFields,
  passwordField,
  passwordMismatchIssue,
  passwordsMatch,
  sortFields,
  z,
} from '../../validator.js'

/**
 * By which columns the user listing sorts: the ones the screen shows.
 * Mirror (path and name) of the VineJS one in
 * `backend/app/validators/administrator/users.validator.ts`.
 */
export const USER_SORT_COLUMNS = [
  'name',
  'email',
  'role',
  'status',
  'createdAt',
] as const

const userFields = {
  name: z.string().trim().min(1).max(120),
  email: emailField(),
  role: z.enum(USER_ROLES),
  status: z.enum(ACTIVE_STATUSES),
  avatarId: z.uuid().nullable().optional(),
}

/** `role` is required: the role is always explicit. */
export const AdministratorUserCreateValidator = z
  .object({
    ...userFields,
    status: userFields.status.optional(),
    password: passwordField(),
    passwordConfirmation: z.string().max(32),
  })
  .refine(
    (value) => passwordsMatch(value.password, value.passwordConfirmation),
    passwordMismatchIssue(),
  )

/** Every field is optional: absent means "leave alone"; only `avatarId` accepts `null`. */
export const AdministratorUserUpdateValidator = z
  .object({
    name: userFields.name.optional(),
    email: userFields.email.optional(),
    role: userFields.role.optional(),
    status: userFields.status.optional(),
    avatarId: userFields.avatarId,
    password: passwordField().optional(),
    passwordConfirmation: z.string().max(32).optional(),
  })
  .refine(
    (value) => passwordsMatch(value.password, value.passwordConfirmation),
    passwordMismatchIssue(),
  )

export const AdministratorUserPaginateValidator = z.object({
  ...paginationFields(),
  trashed: z.enum(TRASHED_MODES).optional(),
  ...sortFields(USER_SORT_COLUMNS),
  role: userFields.role.optional(),
  status: userFields.status.optional(),
})

export type AdministratorUserCreatePayload = z.infer<
  typeof AdministratorUserCreateValidator
>

export type AdministratorUserUpdatePayload = z.infer<
  typeof AdministratorUserUpdateValidator
>

export type AdministratorUserPaginatePayload = z.infer<
  typeof AdministratorUserPaginateValidator
>
