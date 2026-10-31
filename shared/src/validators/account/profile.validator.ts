import {
  emailField,
  passwordField,
  passwordMismatchIssue,
  passwordsMatch,
  requiredIssue,
  z,
} from '../../validator.js'

/**
 * The account itself, edited by its owner. Mirror (path and name) of the VineJS one in
 * `backend/app/validators/account/profile.validator.ts`.
 *
 * Every field is optional: absent means "leave alone". `role` and `status` are not
 * here: nobody changes their own role. `currentPassword` is proof of identity,
 * required only when `password` is sent.
 */
export const AccountProfileUpdateValidator = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: emailField().optional(),
    password: passwordField().optional(),
    passwordConfirmation: z.string().max(32).optional(),
    currentPassword: z.string().max(32).optional(),
    avatarId: z.uuid().nullable().optional(),
  })
  .refine(
    (value) => passwordsMatch(value.password, value.passwordConfirmation),
    passwordMismatchIssue(),
  )
  .refine(
    (value) =>
      value.password === undefined || value.currentPassword !== undefined,
    requiredIssue(['currentPassword']),
  )

export type AccountProfileUpdatePayload = z.infer<
  typeof AccountProfileUpdateValidator
>
