import { vine, email } from '#core/validator'
import type { Infer } from '#core/validator'

export const AuthenticationSignInValidator = vine.create({
  email: email(),
  // Entrar não valida força: a senha só é comparada com o hash guardado.
  // Exigir o formato atual aqui trancaria fora quem cadastrou antes de a regra
  // endurecer - e diria, pela mensagem de validação, qual é a política.
  password: vine.string().maxLength(128),
})

export type AuthenticationSignInPayload = Infer<typeof AuthenticationSignInValidator>
