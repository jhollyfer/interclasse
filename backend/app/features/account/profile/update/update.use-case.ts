import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AccountProfileShowResponse,
  type Actor,
  type Either,
  type Merge,
} from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UserRepository } from '#repositories/user/user.repository'
import { SessionRepository } from '#repositories/session/session.repository'
import { FileRefusal } from '#features/storages/files/_shared.file-refusal'
import { UserRefusal } from '#features/administrator/users/_shared.user-refusal'
import type { AccountProfileUpdatePayload } from '#validators/account/profile.validator'

type Payload = Merge<AccountProfileUpdatePayload, { actor: Actor }>
type Response = Either<HTTPException, AccountProfileShowResponse>

/**
 * Edits the own account. The account is the session `actor` (_standards/backend.md
 * §4.3), and so there is no id in the path.
 */
@inject()
export default class AccountProfileUpdateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storages: StorageRepository,
    private readonly sessions: SessionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  // `currentPassword` leaves the payload here: it is proof of identity, not a
  // column, and letting it through would make the edit try to save it.
  async execute({ actor, currentPassword, ...changes }: Payload): Promise<Response> {
    try {
      const user = await this.users.findById(actor.id)

      if (!user)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      // Without filtering archived: the email `unique` holds for the whole
      // table, so without this check the save would blow the constraint and
      // become a 500.
      if (
        changes.email &&
        changes.email !== user.snapshot().email &&
        (await this.users.existsByEmail(changes.email, actor.id))
      )
        return left(UserRefusal.http({ code: 'USER_ALREADY_EXISTS' }, this.i18n))

      // Before the edit: `avatar_id` is a foreign key, and without this check a nonexistent
      // uuid would blow the constraint and become a 500. It also refuses what is
      // still `PENDING` - the binary goes straight to the bucket, and attaching
      // before confirmation would publish a half-uploaded photo.
      if (changes.avatarId && !(await this.storages.areAttachable([changes.avatarId])))
        return left(FileRefusal.attachmentNotFound('avatarId', this.i18n))

      // The proof of identity for a password change: the session proves possession of the cookie,
      // and a hijacked cookie would change the password without the owner saying anything.
      // That `currentPassword` exists when `password` exists is the validator's job; this
      // guarantees (`requiredIfExists`).
      const stored = user.snapshot().password
      const currentConfirmed =
        Boolean(changes.password) &&
        currentPassword !== undefined &&
        (await hash.verify(stored, currentPassword))
      const sameAsCurrent =
        currentConfirmed &&
        changes.password !== undefined &&
        (await hash.verify(stored, changes.password))

      const updated = user.updateOwn(changes, { currentConfirmed, sameAsCurrent }, new Date())
      if (updated.isLeft()) return left(UserRefusal.http(updated.value, this.i18n))

      // Changing email or password drops every session, including this request's:
      // saving and revoking land together.
      // The email check above does not close the race: `save` returns the
      // same fact when the database `unique` loses it (_standards/backend.md §4.4).
      const written = await this.unitOfWork.run(async (): Promise<Either<HTTPException, null>> => {
        const saved = await this.users.save(user)
        if (saved.isLeft()) return left(UserRefusal.http(saved.value, this.i18n))

        if (updated.value.revokesSessions) await this.sessions.revokeAll(actor.id)

        return right(null)
      })
      if (written.isLeft()) return left(written.value)

      // Reload after saving: whoever just changed the photo must receive
      // the new `url` in the same response, without an extra read.
      const profile = await this.users.detail(actor.id)
      if (!profile)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      return right({
        ...profile,
        avatar: await this.bucket.withOptionalUrl(profile.avatar),
      })
    } catch (error) {
      logger.error({ err: error }, '[account/profile > update][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ACCOUNT_PROFILE_UPDATE_ERROR',
        ),
      )
    }
  }
}
