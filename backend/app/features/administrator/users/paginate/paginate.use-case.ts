import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdministratorUserShowResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import { UserRepository } from '#repositories/user/user.repository'
import { sortOrder } from '#features/_shared.sort'
import type { AdministratorUserPaginatePayload } from '#validators/administrator/users.validator'

type Payload = AdministratorUserPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorUserShowResponse>>

/**
 * A listagem enxerga os três papéis, sem recorte fixo: não há um `OWNER` que
 * precise ficar de fora, e é este recurso que gerencia administradores,
 * conselheiros e representantes.
 *
 * A senha não sai daqui: a resposta do `shared/` não a tem.
 */
@inject()
export default class AdministratorUserPaginateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const [sort, direction] = sortOrder(payload, 'name')

      const page = await this.users.paginate({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        role: payload.role,
        status: payload.status,
        trashed: payload.trashed,
        sort,
        direction,
      })

      return right({
        meta: page.meta,
        data: await Promise.all(
          page.data.map(async (user) => ({
            ...user,
            avatar: await this.bucket.withOptionalUrl(user.avatar),
          })),
        ),
      })
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_USER_PAGINATE_ERROR',
        ),
      )
    }
  }
}
