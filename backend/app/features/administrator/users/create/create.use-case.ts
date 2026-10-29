import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import User from '#models/user'
import { StorageContract } from '#services/storage/storage-contract.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { isUniqueViolation } from '#features/_shared.database'
import type { UserCreatePayload } from '#features/administrator/users/users.validator'

type Payload = UserCreatePayload
type Response = Either<HTTPException, User>

/**
 * Cria a conta. Único caminho de criação de usuário na API - não há cadastro
 * público -, e por isso o papel vem sempre explícito no payload.
 *
 * A senha entra em texto puro e sai cifrada: o mixin `withAuthFinder` do model
 * gera o hash no `save`. Passar o hash daqui geraria um hash de hash e nenhum
 * login funcionaria.
 */
@inject()
export default class AdministratorUserCreateUseCase {
  constructor(private readonly storage: StorageContract) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // A foto é conferida **antes** de qualquer escrita: `avatar_id` é chave
      // estrangeira, e sem isto um uuid inexistente estouraria a constraint e
      // viraria `500` em vez de `422` apontando o campo.
      if (payload.avatarId) {
        const avatar = await this.storage.assertExist('avatarId', [payload.avatarId])

        if (avatar.isLeft()) return left(avatar.value)
      }

      // Busca **sem** filtrar arquivados: o `unique` de `email` vale para a
      // tabela inteira, então conta arquivada continua ocupando o e-mail.
      const existing = await User.query().where('email', payload.email).first()

      if (existing && !existing.deletedAt)
        return left(
          HTTPException.Conflict('Usuário já existe', 'USER_ALREADY_EXISTS', {
            email: 'Já existe um usuário com este e-mail',
          }),
        )

      // Como em notices: `email` é `UNIQUE` global e a remoção é lógica, então
      // inserir de novo esbarraria no índice e viraria `500`. Reativar a linha
      // arquivada com os dados novos preserva `id` e `created_at` - e é o que
      // dispensa uma guarda de colisão no `unarchive`, porque nunca existe um
      // registro-sombra ocupando o `unique`.
      const user = existing ?? new User()

      user.merge({ ...payload, deletedAt: null })
      await user.save()

      // `status` vem de `DEFAULT` no banco e o `INSERT` do Lucid só devolve a
      // chave primária: sem o refresh a resposta sairia sem ele.
      await user.refresh()
      await user.load('avatar')

      return right(user)
    } catch (error) {
      // A checagem de e-mail acima não fecha a corrida: o segundo de dois
      // pedidos simultâneos esbarra no `unique` do banco (_standards/backend.md §4.4).
      if (isUniqueViolation(error))
        return left(
          HTTPException.Conflict('Usuário já existe', 'USER_ALREADY_EXISTS', {
            email: 'Já existe um usuário com este e-mail',
          }),
        )

      logger.error({ err: error }, '[users > create][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'USER_CREATE_ERROR'),
      )
    }
  }
}
