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
 * Takes the account out of the trash. The mirror of `archive`: it searches only what is
 * archived, so a live user is `404` here for the same reason an
 * archived user is `404` there.
 *
 * No token is recreated - whoever was restored signs in again through sign-in.
 *
 * No email collision guard: `create` reactivates the archived row instead
 * of inserting another, so there is never a shadow record occupying the `unique`.
 */
@inject()
export default class AdministratorUserUnarchiveUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const user = await this.users.findAnyById(id)

      if (!user)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      const restored = user.unarchive(new Date())
      if (restored.isLeft()) return left(UserRefusal.http(restored.value, this.i18n))

      const saved = await this.users.save(user)
      if (saved.isLeft()) return left(UserRefusal.http(saved.value, this.i18n))

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > unarchive][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_USER_UNARCHIVE_ERROR',
        ),
      )
    }
  }
}
