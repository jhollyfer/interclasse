import User from '#models/user'
import ClassroomService from '#services/classroom.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, User>

/**
 * Envia a conta para a lixeira. Usuário já arquivado é indistinguível de
 * inexistente (`404`), porque o filtro é o mesmo que toda leitura aplica.
 *
 * Diferente dos recursos de conteúdo, arquivar aqui **também revoga as
 * sessões**: o guard verifica assinatura e validade do token e não conhece
 * `deleted_at`, então sem isto o arquivado seguiria dentro do painel até o
 * token vencer - e arquivar não desligaria ninguém.
 *
 * A própria conta não chega aqui: a `UserPolicy`, checada pelo controller com
 * `ctx.bouncer`, a recusa com `403` antes de qualquer leitura. É a guarda de auto-trancamento do projeto
 * de referência, que mantém intocável a conta que ninguém mais consegue
 * restaurar; sem um terceiro papel para reservá-la, aqui o intocável é
 * quem está fazendo a requisição. Como todo administrador vivo é protegido de
 * si mesmo, o último deles nunca cai - a guarda de identidade já entrega o que
 * uma contagem entregaria.
 */
@inject()
export default class AdministratorUserArchiveUseCase {
  constructor(private readonly classrooms: ClassroomService) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const user = await User.query()
        .where('id', id)
        .withScopes((scopes) => scopes.notDeleted())
        .first()

      if (!user) return left(HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'))

      user.deletedAt = DateTime.now()
      await user.save()

      await User.accessTokens.deleteAll(user)
      // Conta arquivada não aconselha nem representa turma nenhuma.
      await this.classrooms.detach(user)

      return right(user)
    } catch (error) {
      logger.error({ err: error }, '[users > archive][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'USER_ARCHIVE_ERROR')
      )
    }
  }
}
