import {
  emailField,
  passwordField,
  passwordMismatchIssue,
  passwordsMatch,
  z,
} from '../../validator.js'

/**
 * A própria conta, editada pelo dono. Par de caminho e nome do VineJS de
 * `backend/app/validators/account/profile.validator.ts`.
 *
 * Todo campo é opcional: ausente é "não mexer". `role` e `status` não entram:
 * ninguém muda o próprio papel. `currentPassword` é prova de identidade,
 * exigida só quando `password` vem.
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
  .refine((value) => value.password === undefined || value.currentPassword !== undefined, {
    path: ['currentPassword'],
    error: 'required',
  })

export type AccountProfileUpdatePayload = z.infer<typeof AccountProfileUpdateValidator>
