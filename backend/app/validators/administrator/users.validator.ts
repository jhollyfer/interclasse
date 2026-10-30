import { USER_ROLES, USER_SORT_COLUMNS } from '@interclasse/shared'

import {
  vine,
  notNull,
  email,
  password,
  activeStatus,
  paginationFields,
  trashedField,
  sortFields,
} from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * O papel de um usuário gerenciado pelo painel.
 *
 * O enum inteiro, sem recorte: os três papéis nascem pelo painel, e o purge fica
 * com o `ADMINISTRATOR`. Não há papel a excluir da lista.
 */
export function manageableRole() {
  return vine.enum(USER_ROLES)
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
 * entra no payload validado, então não há o que descartar antes do `merge()`.
 *
 * `status` é opcional porque a coluna tem `DEFAULT 'ACTIVE'`: a conta nasce
 * podendo entrar, e desativar é edição.
 */
export const AdministratorUserCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  email: email(),
  password: password(),
  role: manageableRole(),
  status: activeStatus().optional(),
  // `nullable` é o que permite tirar a foto sem trocá-la. O uuid só garante o
  // formato; que o arquivo exista é checado no use-case, senão a violação da
  // chave estrangeira estouraria como `500` em vez de `422`.
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * O que `PUT /administrator/users/:id` recebe.
 *
 * **Todo campo é opcional**, inclusive os obrigatórios na criação: campo
 * ausente significa "não mexer", e não "apagar". Só `avatarId` aceita
 * `null` explícito.
 *
 * `role` entra aqui, ao contrário de `ProfileUpdateValidator`: promover e
 * rebaixar é o que este recurso existe para fazer, e ninguém muda o próprio
 * papel por `/account`.
 */
export const AdministratorUserUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional().use(notNull()),
  email: email().optional().use(notNull()),
  password: password().optional().use(notNull()),
  role: manageableRole().optional().use(notNull()),
  status: activeStatus().optional().use(notNull()),
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * O que `GET /administrator/users` aceita na query.
 *
 * Dois filtros próprios, que são os dois recortes da tela: `role` separa quem
 * administra de quem edita, e `status` separa quem entra de quem foi desativado
 * sem ser arquivado.
 */
export const AdministratorUserPaginateValidator = vine.create({
  ...paginationFields(),
  ...trashedField(),
  ...sortFields(USER_SORT_COLUMNS),
  role: manageableRole().optional(),
  status: activeStatus().optional(),
})

export type AdministratorUserCreatePayload = Infer<typeof AdministratorUserCreateValidator>

export type AdministratorUserUpdatePayload = Infer<typeof AdministratorUserUpdateValidator>

export type AdministratorUserPaginatePayload = Infer<typeof AdministratorUserPaginateValidator>
