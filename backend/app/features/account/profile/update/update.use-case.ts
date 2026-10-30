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
 * Edita a própria conta. A conta é o `actor` da sessão (_standards/backend.md
 * §4.3), e por isso não há id no caminho.
 */
@inject()
export default class AccountProfileUpdateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storages: StorageRepository,
    private readonly sessions: SessionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly i18n: I18n,
  ) {}

  // `currentPassword` sai do payload aqui: ele é prova de identidade, não
  // coluna, e deixá-lo passar faria a edição tentar gravá-lo.
  async execute({ actor, currentPassword, ...changes }: Payload): Promise<Response> {
    try {
      const user = await this.users.findById(actor.id)

      if (!user)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      // Sem filtrar arquivados: o `unique` do e-mail vale para a tabela
      // inteira, então sem esta checagem o save estouraria a constraint e
      // viraria 500.
      if (
        changes.email &&
        changes.email !== user.snapshot().email &&
        (await this.users.existsByEmail(changes.email, actor.id))
      )
        return left(UserRefusal.http({ code: 'USER_ALREADY_EXISTS' }, this.i18n))

      // Antes da edição: `avatar_id` é chave estrangeira, e sem esta checagem um
      // uuid inexistente estouraria a constraint e viraria 500. Também recusa o
      // que ainda está `PENDING` - o binário sobe direto para o bucket, e anexar
      // antes da confirmação publicaria uma foto pela metade.
      if (changes.avatarId && !(await this.storages.areAttachable([changes.avatarId])))
        return left(FileRefusal.attachmentNotFound('avatarId', this.i18n))

      // A prova de identidade da troca de senha: a sessão prova posse do cookie,
      // e um cookie sequestrado trocaria a senha sem que o dono dissesse nada.
      // Que `currentPassword` exista quando `password` existe é o validator que
      // garante (`requiredIfExists`).
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

      // Trocar e-mail ou senha derruba todas as sessões, inclusive a desta
      // requisição: gravar e revogar caem juntos.
      // A checagem de e-mail acima não fecha a corrida: o `save` devolve o
      // mesmo fato quando o `unique` do banco a perde (_standards/backend.md §4.4).
      const written = await this.unitOfWork.run(async (): Promise<Either<HTTPException, null>> => {
        const saved = await this.users.save(user)
        if (saved.isLeft()) return left(UserRefusal.http(saved.value, this.i18n))

        if (updated.value.revokesSessions) await this.sessions.revokeAll(actor.id)

        return right(null)
      })
      if (written.isLeft()) return left(written.value)

      // Recarrega depois de gravar: quem acabou de trocar a foto tem de receber
      // a `url` nova na mesma resposta, sem uma leitura a mais.
      const profile = await this.users.detail(actor.id)
      if (!profile)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      return right(profile)
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
