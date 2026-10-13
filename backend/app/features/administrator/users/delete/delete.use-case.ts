import User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, User>

/**
 * Apaga a conta de vez. Só aceita usuário já arquivado - o caminho para a
 * lixeira é `PATCH /:id/archive`, e exigir a passagem por lá é o que impede um
 * clique de perder a conta sem escala intermediária.
 *
 * A busca **não** filtra `deletedAt`, senão usuário vivo e inexistente cairiam
 * no mesmo `404` e o cliente não saberia qual dos dois aconteceu.
 *
 * Sem contagem de referências, apesar de `users` ser o único alvo de chave
 * estrangeira do esquema: quem aponta é `auth_access_tokens`, com `CASCADE`, e
 * token não é dado de negócio - é credencial viva, que precisa mesmo ir junto.
 * Nenhuma tabela de conteúdo guarda autor, então não há o que orfanar. O avatar
 * em `storages` fica, porque a chave é `SET NULL` e o binário é neutro.
 *
 * A própria conta não passa por aqui, e a guarda vem antes da exigência de
 * arquivamento: a própria conta também não é arquivável, então sem a guarda a
 * resposta seria `409` - que descreve o estado do registro e não a regra que o
 * protege.
 */
@inject()
export default class AdministratorUserDeleteUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const user = await User.query().where('id', id).first()

      if (!user) return left(HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'))

      if (!user.deletedAt)
        return left(
          HTTPException.Conflict('Usuário não está arquivado', 'USER_NOT_ARCHIVED', {
            id: 'Arquive o usuário antes de apagá-lo',
          })
        )

      await user.delete()

      return right(user)
    } catch (error) {
      logger.error({ err: error }, '[users > delete][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'USER_DELETE_ERROR')
      )
    }
  }
}
