import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { UserRepository } from '#repositories/user/user.repository'
import { UserRefusal } from '#features/administrator/users/_shared.user-refusal'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Deletes the account for good. Only accepts an already archived user - the path to the
 * trash is `PATCH /:id/archive`, and requiring the passage through there is what stops a
 * click from losing the account without an intermediate step (entity rule).
 *
 * The search does **not** filter the trash, otherwise a live and a nonexistent user would fall into the
 * same `404` and the client would not know which of the two happened.
 *
 * No reference count, even though `users` is the only foreign key target of the
 * schema: what points at it is `auth_access_tokens`, with `CASCADE`, and a
 * token is not business data - it is a live credential, which must indeed go along.
 * No content table keeps an author, so there is nothing to orphan. The avatar
 * in `storages` stays, because the key is `SET NULL` and the binary is neutral.
 *
 * The own account does not pass through here, and the guard comes before the archiving
 * requirement: the own account is also not archivable, so without the guard the
 * response would be `409` - which describes the record state and not the rule that
 * protects.
 */
@inject()
export default class AdministratorUserDeleteUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const user = await this.users.findAnyById(id)

      if (!user)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      const removable = user.remove()
      if (removable.isLeft()) return left(UserRefusal.http(removable.value, this.i18n))

      await this.users.delete(user)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > delete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_USER_DELETE_ERROR',
        ),
      )
    }
  }
}
