import {
  vine,
  notNull,
  email,
  paginationFields,
  password,
  sortFields,
  trashedField,
} from '#/lib/validator'
import type { Infer } from '#/lib/validator'
import { ACTIVE_STATUSES, USER_ROLES } from '#/lib/entity'

/**
 * Por quais colunas a listagem de usuários pode ser ordenada.
 *
 * São as colunas que a tela mostra, e nada além: `password` é hash e ordenar por
 * ele não significa nada, e `avatar` é relação, que exigiria `join`.
 */
export const USER_SORT_COLUMNS = [
  'name',
  'email',
  'role',
  'status',
  'createdAt',
] as const

/**
 * O papel de um usuário gerenciado pelo painel.
 *
 * Aqui é o enum inteiro: os três papéis nascem pelo painel.
 */
export function manageableRole() {
  return vine.enum(USER_ROLES)
}

export function activeStatus() {
  return vine.enum(ACTIVE_STATUSES)
}

/**
 * O que `POST /administrator/users` recebe.
 *
 * `role` é **obrigatório**: a coluna não tem `DEFAULT`, e o papel é sempre
 * explícito. `backend-old` caía em `ADMINISTRATOR` por omissão, e um caminho de
 * criação esquecido gravava o papel mais poderoso em silêncio.
 *
 * `password` passa pela regra de força compartilhada, que também exige
 * `passwordConfirmation` com o mesmo valor - o campo é lido do input cru e não
 * entra no payload validado, então não há o que descartar antes de enviar.
 *
 * `status` é opcional porque a coluna tem `DEFAULT 'ACTIVE'`: a conta nasce
 * podendo entrar, e desativar é edição.
 */
export const UserCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  email: email(),
  password: password(),
  /**
   * Declarado aqui e **não** no schema do backend, como em
   * `AccountUpdateValidator` e pelo mesmo motivo: a regra `confirmed()` de
   * `password()` lê o campo do input cru e reporta o erro nele, mas o VineJS só
   * **inclui** no payload validado o que o schema declara. Sem esta linha o
   * corpo sairia daqui sem a confirmação, e o servidor - que a lê do corpo cru -
   * recusaria toda criação com 422.
   */
  passwordConfirmation: vine.string().maxLength(32),
  role: manageableRole(),
  status: activeStatus().optional(),
  // `nullable` é o que permite tirar a foto sem trocá-la. O uuid só garante o
  // formato; que o arquivo exista é checado no use-case do servidor.
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * O que `PUT /administrator/users/:id` recebe.
 *
 * **Todo campo é opcional**, inclusive os obrigatórios na criação: campo ausente
 * significa "não mexer", e não "apagar". Só `avatarId` aceita `null`
 * explícito.
 *
 * `role` entra aqui, ao contrário de `AccountUpdateValidator`: promover e
 * rebaixar é o que este recurso existe para fazer, e ninguém muda o próprio
 * papel por `/account`.
 */
export const UserUpdateValidator = vine.create({
  name: vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(120)
    .optional()
    .use(notNull()),
  email: email().optional().use(notNull()),
  password: password().optional(),
  /**
   * Declarado pela mesma razão da criação. Opcional como a senha, e pelo mesmo
   * motivo: em branco significa "não trocar", e `convertEmptyStringsToNull`
   * transforma o `''` em `null`.
   */
  passwordConfirmation: vine.string().maxLength(32).optional(),
  role: manageableRole().optional().use(notNull()),
  status: activeStatus().optional().use(notNull()),
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * O que `GET /administrator/users` aceita na query.
 *
 * Dois filtros próprios, que são os dois recortes da tela: `role` separa
 * organização, conselheiros e representantes, e `status` separa quem entra de quem foi desativado
 * sem ser arquivado.
 */
export const UserPaginateValidator = vine.create({
  ...paginationFields(),
  ...trashedField(),
  ...sortFields(USER_SORT_COLUMNS),
  role: manageableRole().optional(),
  status: activeStatus().optional(),
})

export type UserCreatePayload = Readonly<Infer<typeof UserCreateValidator>>
export type UserUpdatePayload = Readonly<Infer<typeof UserUpdateValidator>>
export type UserPaginatePayload = Readonly<Infer<typeof UserPaginateValidator>>
