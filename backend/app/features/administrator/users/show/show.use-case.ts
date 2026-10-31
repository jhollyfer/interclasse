import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorUserShowResponse, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import { UserRepository } from '#repositories/user/user.repository'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorUserShowResponse>

@inject()
export default class AdministratorUserShowUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      // An archived user is indistinguishable from nonexistent here, because the filter
      // is the same one the default listing applies. To reach it, list with
      // `?trashed`.
      const user = await this.users.detail(id)

      if (!user)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      return right({ ...user, avatar: await this.bucket.withOptionalUrl(user.avatar) })
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_USER_SHOW_ERROR',
        ),
      )
    }
  }
}
