import { emailField, z } from '../../validator.js'

/**
 * Par de caminho e nome do VineJS de
 * `backend/app/validators/authentication/sessions.validator.ts`
 * (`_standards/architecture.md` §10).
 *
 * Entrar não valida força: a senha só é comparada com o hash guardado.
 */
export const AuthenticationSessionSignInValidator = z.object({
  email: emailField(),
  password: z.string().max(128),
})

export type AuthenticationSessionSignInPayload = z.infer<
  typeof AuthenticationSessionSignInValidator
>
