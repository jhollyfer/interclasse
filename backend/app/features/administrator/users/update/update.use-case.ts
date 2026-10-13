import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import User from '#models/user'
import SessionService from '#services/session/session.service'
import ClassroomService from '#services/classroom/classroom.service'
import { StorageContract } from '#services/storage/storage-contract.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { isUniqueViolation } from '#features/_shared.database'
import { ACTIVE_STATUS, type Merge } from '#core/entity'
import type { UserUpdatePayload } from '#features/administrator/users/users.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<UserUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, User>

/**
 * Edita a conta. Nome, e-mail, senha e foto valem para qualquer alvo; papel e
 * status, não: sobre a própria conta os dois são recusados.
 *
 * É a guarda de auto-trancamento, no mesmo molde do projeto de referência -
 * `403` antes de qualquer leitura, dizendo que é proibido em vez de esconder a
 * existência. Sem ela um administrador se rebaixa a conselheiro ou se marca
 * `INACTIVE` e perde o painel, e o único conserto é rodar o seeder.
 *
 * Nome e e-mail continuam editáveis sobre a própria conta: nenhum dos dois
 * tranca ninguém para fora.
 */
@inject()
export default class AdministratorUserUpdateUseCase {
  constructor(
    private readonly storage: StorageContract,
    private readonly classrooms: ClassroomService,
    private readonly session: SessionService,
  ) {}

  async execute({ id, ...payload }: Payload): Promise<Response> {
    try {
      const user = await User.query()
        .where('id', id)
        .withScopes((scopes) => scopes.notDeleted())
        .first()

      if (!user) return left(HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'))

      if (payload.email && payload.email !== user.email) {
        // Sem filtrar arquivados: o `unique` do e-mail vale para a tabela
        // inteira, então sem esta checagem o save estouraria a constraint e
        // viraria `500`.
        const exist = await User.query().where('email', payload.email).whereNot('id', id).first()

        if (exist)
          return left(
            HTTPException.Conflict('Usuário já existe', 'USER_ALREADY_EXISTS', {
              email: 'Já existe um usuário com este e-mail',
            }),
          )
      }

      if (payload.avatarId) {
        const avatar = await this.storage.assertExist('avatarId', [payload.avatarId])

        if (avatar.isLeft()) return left(avatar.value)
      }

      // Trocar e-mail ou senha derruba todas as sessões do alvo: sem isso um
      // token anterior à troca de acesso sobreviveria, e desligar o acesso de
      // alguém não desligaria nada. Avaliado antes do merge, enquanto
      // `user.email` ainda é o valor atual.
      //
      // Desativar a conta e trocar o papel também derrubam: o guard não lê
      // `status`, e um conselheiro desativado seguiria editando listas até o
      // token vencer.
      const roleChanged = Boolean(payload.role && payload.role !== user.role)
      const shouldRevoke =
        Boolean(payload.email && payload.email !== user.email) ||
        Boolean(payload.password) ||
        roleChanged ||
        payload.status === ACTIVE_STATUS.INACTIVE

      // `merge` só escreve as chaves presentes: campo ausente no payload não
      // vira `undefined` na linha. É o que faz o `PUT` ser parcial de verdade
      //.
      await db.transaction(async (trx) => {
        user.useTransaction(trx)
        user.merge(payload)
        await user.save()

        // O mixin `withAuthFinder` já re-hasheou a senha no save acima.
        if (shouldRevoke) await this.session.revokeAll(user, trx)
        if (roleChanged) await this.classrooms.detach(user, trx)
      })

      // Recarrega antes de responder: quem acabou de editar recebe a linha como
      // ela ficou no banco, com `updated_at` e a foto nova, sem uma segunda
      // requisição.
      await user.refresh()
      await user.load('avatar')

      return right(user)
    } catch (error) {
      // A checagem de e-mail acima não fecha a corrida: o segundo de dois
      // pedidos simultâneos esbarra no `unique` do banco (_padroes/backend.md §4.4).
      if (isUniqueViolation(error))
        return left(
          HTTPException.Conflict('Usuário já existe', 'USER_ALREADY_EXISTS', {
            email: 'Usuário já existe',
          }),
        )

      logger.error({ err: error }, '[users > update][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'USER_UPDATE_ERROR'),
      )
    }
  }
}
