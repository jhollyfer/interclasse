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
 * Tira a conta da lixeira. O espelho de `archive`: busca só o que está
 * arquivado, então usuário vivo é `404` aqui pela mesma razão que usuário
 * arquivado é `404` lá.
 *
 * Nenhum token é recriado - quem foi restaurado entra de novo pelo sign-in.
 *
 * Sem guarda de colisão de e-mail: o `create` reativa a linha arquivada em vez
 * de inserir outra, então nunca existe um registro-sombra ocupando o `unique`.
 */
@inject()
export default class AdministratorUserUnarchiveUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const user = await this.users.findArchivedById(id)

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
