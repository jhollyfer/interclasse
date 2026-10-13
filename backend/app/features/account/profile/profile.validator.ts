import { vine, notNull, email, password } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * A própria conta, editada pelo dono dela.
 *
 * **Todo campo é opcional**: campo ausente significa "não mexer", e não
 * "apagar". `backend-old` usava `PATCH` com um schema que exigia `name`,
 * `email`, `role` e `avatarId` - o verbo prometia parcial e o schema recusava
 * parcial.
 *
 * `role` e `status` não entram: o papel é definido na criação, pelo
 * administrador, e ninguém muda o próprio. Declará-los só para ignorar depois
 * convidaria alguém a tentar.
 */
export const ProfileUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional().use(notNull()),
  email: email().optional().use(notNull()),
  password: password().optional().use(notNull()),
  /**
   * A senha atual, exigida **só** quando `password` vem no payload.
   *
   * É prova de identidade, e não de força: quem sequestra uma sessão tem o
   * cookie, mas não sabe a senha. `PASSWORD_SAME_AS_CURRENT` não serve para
   * isso - ele compara a nova com o hash, e passar por ele é justamente não
   * saber a atual.
   *
   * `requiredIfExists` e não uma checagem no use-case: a obrigatoriedade
   * condicional é forma do payload, e aqui ela vira `422` apontando o campo -
   * é o que `backend-old` respondia como erro genérico
   * (`profile/use-cases/update.use-case.ts:22`).
   *
   * Sem as regras de força de `password()`: o valor é conferido contra o hash,
   * não gravado. O teto de 32 é o mesmo da política, porque é o maior valor que
   * a aplicação já pode ter gravado.
   */
  currentPassword: vine.string().maxLength(32).optional().requiredIfExists('password'),
  // `nullable` é o que permite tirar a foto sem trocá-la. O uuid só garante o
  // formato; que o arquivo exista é checado no use-case, senão a violação da
  // chave estrangeira estouraria como 500 em vez de 422.
  avatarId: vine.string().uuid().nullable().optional(),
})

export type ProfileUpdatePayload = Infer<typeof ProfileUpdateValidator>
