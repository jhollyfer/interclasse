import { vine, email } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const SessionSignInValidator = vine.create({
  email: email(),
  // Entrar não valida força, como no backend: a senha só é comparada com o hash
  // guardado, e exigir o formato atual travaria quem cadastrou antes - e diria,
  // pela mensagem de validação, qual é a política.
  password: vine.string().maxLength(128),
})

export type SessionSignInPayload = Infer<typeof SessionSignInValidator>
