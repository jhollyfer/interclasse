import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type AccountProfileShowResponse,
  type Either,
} from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import { UserRepository } from '#repositories/user/user.repository'

type Payload = { actor: Actor }
type Response = Either<HTTPException, AccountProfileShowResponse>

/**
 * A leitura da própria conta: o `actor` da sessão (_standards/backend.md §4.3).
 *
 * O guard já leu a conta nesta requisição, com o filtro de arquivado e de
 * inativo - quem foi arquivado não chega até aqui. O que se lê de novo é a
 * conta com o avatar, a `url` dele já assinada.
 */
@inject()
export default class AccountProfileShowUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  async execute({ actor }: Payload): Promise<Response> {
    try {
      const profile = await this.users.detail(actor.id)

      if (!profile)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      return right({
        ...profile,
        avatar: profile.avatar && (await this.bucket.withUrl(profile.avatar)),
      })
    } catch (error) {
      logger.error({ err: error }, '[account/profile > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ACCOUNT_PROFILE_SHOW_ERROR',
        ),
      )
    }
  }
}
