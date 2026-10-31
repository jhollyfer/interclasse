import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorUserShowResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UserRepository } from '#repositories/user/user.repository'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { SessionRepository } from '#repositories/session/session.repository'
import { FileRefusal } from '#features/storages/files/_shared.file-refusal'
import { UserRefusal } from '#features/administrator/users/_shared.user-refusal'
import type { AdministratorUserUpdatePayload } from '#validators/administrator/users.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<AdministratorUserUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, AdministratorUserShowResponse>

/**
 * Edits the account. Name, email, password and photo apply to any target; role and
 * status do not: on the own account both are refused.
 *
 * It is the self-lockout guard, in the same mold as the reference project -
 * `403` before any read, saying it is forbidden instead of hiding the
 * existence. Without it an administrator demotes themselves to advisor or marks themselves
 * `INACTIVE` and loses the panel, and the only fix is to run the seeder.
 *
 * Name and email remain editable on the own account: neither locks
 * anyone out.
 */
@inject()
export default class AdministratorUserUpdateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storages: StorageRepository,
    private readonly sessions: SessionRepository,
    private readonly classrooms: ClassroomRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  async execute({ id, ...changes }: Payload): Promise<Response> {
    try {
      const user = await this.users.findById(id)

      if (!user)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      // Without filtering archived: the email `unique` holds for the whole table,
      // so without this check the save would blow the constraint and become a `500`.
      if (
        changes.email &&
        changes.email !== user.snapshot().email &&
        (await this.users.existsByEmail(changes.email, id))
      )
        return left(UserRefusal.http({ code: 'USER_ALREADY_EXISTS' }, this.i18n))

      if (changes.avatarId && !(await this.storages.areAttachable([changes.avatarId])))
        return left(FileRefusal.attachmentNotFound('avatarId', this.i18n))

      // Changing email or password, changing the role and deactivating the account drop the
      // target sessions, and changing the role releases the classrooms: the entity says what
      // the edit obliges to do.
      const effects = user.update(changes, new Date())

      // Saving, dropping the sessions and releasing the classrooms land together: apart, the
      // failure of one would leave the account changed with a session or classroom of the old role.
      // The email check above does not close the race: `save` returns the
      // same fact when the database `unique` loses it (_standards/backend.md §4.4).
      const written = await this.unitOfWork.run(async (): Promise<Either<HTTPException, null>> => {
        const saved = await this.users.save(user)
        if (saved.isLeft()) return left(UserRefusal.http(saved.value, this.i18n))

        if (effects.revokesSessions) await this.sessions.revokeAll(id)
        if (effects.roleChanged) await this.classrooms.detachAccount(id)

        return right(null)
      })
      if (written.isLeft()) return left(written.value)

      // Reload before responding: whoever just edited receives the row as
      // it ended up in the database, with `updated_at` and the new photo.
      const detail = await this.users.detail(id)
      if (!detail)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      return right({
        ...detail,
        avatar: await this.bucket.withOptionalUrl(detail.avatar),
      })
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > update][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_USER_UPDATE_ERROR',
        ),
      )
    }
  }
}
