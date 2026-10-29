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
import { StorageRepository } from '#repositories/storage/storage.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UserRepository } from '#repositories/user/user.repository'
import { ClassroomDetachContract } from '#services/classroom-detach/classroom-detach.contract'
import { SessionContract } from '#services/session/session.contract'
import { AttachmentRefusal } from '#features/_shared.attachment-refusal'
import { UserRefusal } from '#features/_shared.user-refusal'
import { isUniqueViolation } from '#features/_shared.database'
import type { AdministratorUserUpdatePayload } from '#validators/administrator/users.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<AdministratorUserUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, AdministratorUserShowResponse>

/**
 * Edita a conta. Nome, e-mail, senha e foto valem para qualquer alvo; papel e
 * status, não: sobre a própria conta os dois são recusados.
 *
 * É a guarda de auto-trancamento, no mesmo molde do projeto de referência -
 * `403` antes de qualquer leitura, dizendo que é proibido em vez de esconder a
 * existência. Sem ela um administrador se rebaixa a conselheiro ou se marca
 * `INACTIVE` e perde o painel, e o único conserto é rodar o seeder.
 *
 * Nome e e-mail continuam editáveis sobre a própria conta: nenhum dos dois
 * tranca ninguém para fora.
 */
@inject()
export default class AdministratorUserUpdateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storages: StorageRepository,
    private readonly sessions: SessionContract,
    private readonly classrooms: ClassroomDetachContract,
    private readonly unitOfWork: UnitOfWork,
    private readonly i18n: I18n,
  ) {}

  async execute({ id, ...changes }: Payload): Promise<Response> {
    try {
      const user = await this.users.findById(id)

      if (!user)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      // Sem filtrar arquivados: o `unique` do e-mail vale para a tabela inteira,
      // então sem esta checagem o save estouraria a constraint e viraria `500`.
      if (
        changes.email &&
        changes.email !== user.snapshot().email &&
        (await this.users.existsByEmail(changes.email, id))
      )
        return left(UserRefusal.alreadyExists(this.i18n))

      if (changes.avatarId && !(await this.storages.areAttachable([changes.avatarId])))
        return left(AttachmentRefusal.notFound('avatarId', this.i18n))

      // Trocar e-mail ou senha, mudar o papel e desativar a conta derrubam as
      // sessões do alvo, e mudar o papel solta as turmas: a entidade diz o que
      // a edição obriga a fazer.
      const effects = user.update(changes, new Date())

      // Gravar, derrubar as sessões e soltar as turmas caem juntos: soltos, a
      // falha de um deixaria a conta mudada com sessão ou turma do papel antigo.
      await this.unitOfWork.run(async () => {
        await this.users.save(user)

        if (effects.revokesSessions) await this.sessions.revokeAll(id)
        if (effects.roleChanged) await this.classrooms.detach(id)

        return right(null)
      })

      // Recarrega antes de responder: quem acabou de editar recebe a linha como
      // ela ficou no banco, com `updated_at` e a foto nova.
      const detail = await this.users.detail(id)
      if (!detail) throw new Error('a conta gravada não foi encontrada')

      return right(detail)
    } catch (error) {
      // A checagem de e-mail acima não fecha a corrida: o segundo de dois
      // pedidos simultâneos esbarra no `unique` do banco (_standards/backend.md §4.4).
      if (isUniqueViolation(error)) return left(UserRefusal.alreadyExists(this.i18n))

      logger.error({ err: error }, '[users > update][error]')

      return left(
        HTTPException.InternalServerError(this.i18n.t('errors.internal'), 'USER_UPDATE_ERROR'),
      )
    }
  }
}
