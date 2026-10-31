import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UserRepository } from '#repositories/user/user.repository'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { SessionRepository } from '#repositories/session/session.repository'
import { UserRefusal } from '#features/administrator/users/_shared.user-refusal'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Sends the account to the trash. An already archived user is indistinguishable from
 * nonexistent (`404`), because the filter is the same one every read applies.
 *
 * Unlike the content resources, archiving here **also revokes the
 * sessions**: the guard verifies token signature and validity and does not know
 * `deleted_at`, so without this the archived user would stay inside the panel until the
 * token expired - and archiving would not switch anyone off.
 *
 * The own account does not get here: `UserPolicy`, checked by the controller with
 * `ctx.bouncer`, refuses it with `403` before any read. It is the self-lockout guard
 * of the reference project, which keeps untouchable the account that
 * nobody else can restore; without a third role to reserve it, here
 * the untouchable is whoever is making the request. Since every live administrator is
 * protected from themselves, the last one never falls - the identity guard
 * delivers what a count would deliver.
 */
@inject()
export default class AdministratorUserArchiveUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly classrooms: ClassroomRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const user = await this.users.findAnyById(id)

      if (!user)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      const archived = user.archive(new Date())
      if (archived.isLeft()) return left(UserRefusal.http(archived.value, this.i18n))

      // Archiving, dropping the sessions and releasing the classrooms land together: apart, the
      // failure of the second step would leave the account archived with a live session.
      const written = await this.unitOfWork.run(async (): Promise<Either<HTTPException, null>> => {
        const saved = await this.users.save(user)
        if (saved.isLeft()) return left(UserRefusal.http(saved.value, this.i18n))

        await this.sessions.revokeAll(id)
        // An archived account neither advises nor represents any classroom.
        await this.classrooms.detachAccount(id)

        return right(null)
      })
      if (written.isLeft()) return left(written.value)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > archive][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_USER_ARCHIVE_ERROR',
        ),
      )
    }
  }
}
