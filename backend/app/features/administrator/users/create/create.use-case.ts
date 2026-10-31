import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorUserShowResponse, type Either } from '@interclasse/shared'

import { User } from '#domain/user/user.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { UserRepository } from '#repositories/user/user.repository'
import { FileRefusal } from '#features/storages/files/_shared.file-refusal'
import { UserRefusal } from '#features/administrator/users/_shared.user-refusal'
import type { AdministratorUserCreatePayload } from '#validators/administrator/users.validator'

type Payload = AdministratorUserCreatePayload
type Response = Either<HTTPException, AdministratorUserShowResponse>

/**
 * Creates the account. The only way to create a user in the API - there is no public
 * sign-up -, and so the role always comes explicit in the payload.
 *
 * The password comes in plain text and goes out hashed: the persistence does the hashing (model
 * hook). Passing the hash from here would produce a hash of a hash and no login
 * would work.
 */
@inject()
export default class AdministratorUserCreateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storages: StorageRepository,
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // The photo is checked **before** any write: `avatar_id` is a foreign
      // key, and without this a nonexistent uuid would blow the constraint and
      // become a `500` instead of a `422` pointing at the field.
      if (payload.avatarId && !(await this.storages.areAttachable([payload.avatarId])))
        return left(FileRefusal.attachmentNotFound('avatarId', this.i18n))

      // Searches **without** filtering archived: the `unique` on `email` holds for the
      // whole table, so an archived account keeps occupying the email and is
      // reactivated with the new data, instead of inserting again and hitting the
      // index. Reactivating preserves `id` and `created_at`, and spares a collision
      // guard in `unarchive`.
      const existing = await this.users.findByEmail(payload.email)
      const now = new Date()
      let user = User.create({ id: randomUUID(), ...payload, now })

      if (existing) {
        const revived = existing.revive(payload, now)
        if (revived.isLeft()) return left(UserRefusal.http(revived.value, this.i18n))

        user = revived.value
      }

      const saved = await this.users.save(user)
      if (saved.isLeft()) return left(UserRefusal.http(saved.value, this.i18n))

      // Reload before responding: `status` comes from the database `DEFAULT` when it
      // was not given, and the photo comes with the URL.
      const detail = await this.users.detail(user.id)
      if (!detail)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      return right({
        ...detail,
        avatar: await this.bucket.withOptionalUrl(detail.avatar),
      })
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > create][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_USER_CREATE_ERROR',
        ),
      )
    }
  }
}
