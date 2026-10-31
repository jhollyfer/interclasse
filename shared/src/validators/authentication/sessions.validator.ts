import { emailField, z } from '../../validator.js'

/**
 * Mirror (path and name) of the VineJS one in
 * `backend/app/validators/authentication/sessions.validator.ts`
 * (`_standards/architecture.md` §10).
 *
 * Signing in does not validate strength: the password is only compared with the stored hash.
 */
export const AuthenticationSessionSignInValidator = z.object({
  email: emailField(),
  password: z.string().max(128),
})

export type AuthenticationSessionSignInPayload = z.infer<
  typeof AuthenticationSessionSignInValidator
>
