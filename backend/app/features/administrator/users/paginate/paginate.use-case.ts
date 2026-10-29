import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import { PAGINATION, left, right, type Either, type Paginated } from '@interclasse/shared'

import User from '#models/user'
import HTTPException from '#exceptions/http.exception'
import { sortOrder } from '#features/_shared.sort'
import { applyTrashed } from '#features/_shared.trashed'
import type { UserPaginatePayload } from '#validators/administrator/users.validator'

type Payload = UserPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

/**
 * A listagem enxerga os três papéis, sem recorte fixo: não há um
 * `OWNER` que precise ficar de fora, e é este recurso que gerencia
 * administradores, conselheiros e representantes.
 *
 * A senha não sai daqui, e não por omissão: a coluna é `serializeAs: null` no
 * model, então nem a serialização do Lucid a conhece.
 */
@inject()
export default class AdministratorUserPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      // `avatar` precarregado: a listagem mostra a foto, e sem ele a tela teria
      // só o uuid - resolver o arquivo linha a linha seria uma requisição por
      // usuário da página.
      const query = User.query().preload('avatar')

      applyTrashed(query, payload.trashed)

      // Os dois recortes da tela: quem administra contra quem edita, e quem
      // entra contra quem foi desativado sem ser arquivado.
      if (payload.role) query.where('role', payload.role)
      if (payload.status) query.where('status', payload.status)

      // Nome e e-mail, que é o que a listagem mostra e o que se digita para
      // achar uma pessoa.
      //
      // O `OR` vai dentro de uma subquery pelo mesmo motivo dos outros
      // recursos: solto, ele escaparia do `AND` do filtro de lixeira e dos de
      // papel e status, e traria usuário arquivado na listagem padrão.
      if (payload.search) {
        const search = `%${payload.search}%`

        query.where(function (builder) {
          builder.whereILike('name', search).orWhereILike('email', search)
        })
      }

      const users = await query
        .orderBy(...sortOrder(payload, 'name'))
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      // `{ meta, data }` montado à mão: o paginator cru levaria a classe inteira
      // para o tipo da resposta, e `toJSON()` perderia o tipo do item num `any`.
      return right({ meta: users.getMeta(), data: users.all() })
    } catch (error) {
      logger.error({ err: error }, '[users > paginate][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'USER_PAGINATE_ERROR'),
      )
    }
  }
}
