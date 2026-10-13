import { vine, email, password } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

/**
 * A própria conta, editada pelo dono dela.
 *
 * **Todo campo é opcional**: campo ausente significa "não mexer", e não
 * "apagar".
 *
 * `role` e `status` não entram: o papel é definido na criação, pelo
 * administrador, e ninguém muda o próprio.
 */
export const ProfileUpdateValidator = vine.create({
  name: vine.string().trim().maxLength(120).optional(),
  email: email().optional(),
  password: password().optional(),
  /**
   * `passwordConfirmation` precisa ser declarado por dois motivos, e o segundo
   * é o que já foi entendido errado: a regra `confirmed()` de `password()` lê o
   * campo do input cru e reporta o erro nele - mas o VineJS **inclui** no
   * payload validado tudo o que o schema declara. Declarar é o que faz a
   * confirmação chegar ao corpo da requisição.
   *
   * Opcional como a senha, e pelo mesmo motivo: em branco significa "não
   * trocar", e `convertEmptyStringsToNull` transforma o `''` em `null`.
   */
  passwordConfirmation: vine.string().maxLength(32).optional(),
  /**
   * A senha atual, exigida **só** quando `password` vem no payload.
   *
   * É prova de identidade, e não de força: quem sequestra uma sessão tem o
   * cookie, mas não sabe a senha. Sem as regras de força de `password()`: o
   * valor é conferido contra o hash, não gravado.
   */
  currentPassword: vine
    .string()
    .maxLength(32)
    .optional()
    // Pelo VALOR, e não pela chave: o formulário manda `password: ''` quando
    // não se troca senha, e o `requiredIfExists` conta `''` como presente -
    // trocar só a foto pedia a senha atual.
    .requiredWhen((field) => Boolean(field.parent.password)),
  // `nullable` é o que permite tirar a foto sem trocá-la. O uuid só garante o
  // formato; que o arquivo exista é checado no servidor.
  avatarId: vine.string().uuid().nullable().optional(),
})

export type ProfileUpdatePayload = Infer<typeof ProfileUpdateValidator>
