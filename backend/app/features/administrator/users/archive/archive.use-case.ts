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
 * Envia a conta para a lixeira. Usuário já arquivado é indistinguível de
 * inexistente (`404`), porque o filtro é o mesmo que toda leitura aplica.
 *
 * Diferente dos recursos de conteúdo, arquivar aqui **também revoga as
 * sessões**: o guard verifica assinatura e validade do token e não conhece
 * `deleted_at`, então sem isto o arquivado seguiria dentro do painel até o
 * token vencer - e arquivar não desligaria ninguém.
 *
 * A própria conta não chega aqui: a `UserPolicy`, checada pelo controller com
 * `ctx.bouncer`, a recusa com `403` antes de qualquer leitura. É a guarda de
 * auto-trancamento do projeto de referência, que mantém intocável a conta que
 * ninguém mais consegue restaurar; sem um terceiro papel para reservá-la, aqui
 * o intocável é quem está fazendo a requisição. Como todo administrador vivo é
 * protegido de si mesmo, o último deles nunca cai - a guarda de identidade já
 * entrega o que uma contagem entregaria.
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
      const user = await this.users.findById(id)

      if (!user)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      const archived = user.archive(new Date())
      if (archived.isLeft()) return left(UserRefusal.http(archived.value, this.i18n))

      // Arquivar, derrubar as sessões e soltar as turmas caem juntos: soltos, a
      // falha do segundo passo deixaria a conta arquivada com sessão viva.
      const written = await this.unitOfWork.run(async (): Promise<Either<HTTPException, null>> => {
        const saved = await this.users.save(user)
        if (saved.isLeft()) return left(UserRefusal.http(saved.value, this.i18n))

        await this.sessions.revokeAll(id)
        // Conta arquivada não aconselha nem representa turma nenhuma.
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
