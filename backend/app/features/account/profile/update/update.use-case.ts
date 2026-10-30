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
import { SessionContract } from '#services/session/session.contract'
import { AttachmentRefusal } from '#features/_shared.attachment-refusal'
import { UserRefusal } from '#features/_shared.user-refusal'
import { isUniqueViolation } from '#features/_shared.database'
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
    private readonly sessions: SessionContract,
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
        return left(UserRefusal.alreadyExists(this.i18n))

      // Antes da edição: `avatar_id` é chave estrangeira, e sem esta checagem um
      // uuid inexistente estouraria a constraint e viraria 500. Também recusa o
      // que ainda está `PENDING` - o binário sobe direto para o bucket, e anexar
      // antes da confirmação publicaria uma foto pela metade.
      if (changes.avatarId && !(await this.storages.areAttachable([changes.avatarId])))
        return left(AttachmentRefusal.notFound('avatarId', this.i18n))

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
      await this.unitOfWork.run(async () => {
        await this.users.save(user)

        if (updated.value.revokesSessions) await this.sessions.revokeAll(actor.id)

        return right(null)
      })

      // Recarrega depois de gravar: quem acabou de trocar a foto tem de receber
      // a `url` nova na mesma resposta, sem uma leitura a mais.
      const profile = await this.users.detail(actor.id)
      if (!profile) throw new Error('a conta gravada não foi encontrada')

      return right(profile)
    } catch (error) {
      // A checagem de e-mail acima não fecha a corrida: o segundo de dois
      // pedidos simultâneos esbarra no `unique` do banco (_standards/backend.md §4.4).
      if (isUniqueViolation(error)) return left(UserRefusal.alreadyExists(this.i18n))

      logger.error({ err: error }, '[profile > update][error]')

      return left(
        HTTPException.InternalServerError(this.i18n.t('errors.internal'), 'PROFILE_UPDATE_ERROR'),
      )
    }
  }
}
