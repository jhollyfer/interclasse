import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorClassroomShowResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { ClassroomRefusal } from '../_shared.classroom-refusal.ts'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import HTTPException from '#exceptions/http.exception'
import { isUniqueViolation } from '#features/_shared.database'
import type { IdentifierPayload } from '#core/validator'
import type { AdministratorClassroomUpdatePayload } from '#validators/administrator/classrooms.validator'

type Payload = Merge<AdministratorClassroomUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, AdministratorClassroomShowResponse>

/**
 * Renomeia, muda o ano e os vínculos. Campo ausente é "não mexer". A entidade
 * confere só o vínculo que mudou e recusa a troca de categoria da turma sorteada.
 */
@inject()
export default class AdministratorClassroomUpdateUseCase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id, ...changes }: Payload): Promise<Response> {
    try {
      const classroom = await this.classrooms.findById(id)
      if (!classroom) return left(this.notFound())

      if (
        classroom.renamesTo(changes.name) &&
        (await this.classrooms.existsByName(changes.name, id))
      )
        return left(ClassroomRefusal.alreadyExists(this.i18n))

      const facts = await this.classrooms.peopleFacts(classroom.changedLinks(changes), id)
      // Só vale perguntar do sorteio quando o ano levaria a turma a outra categoria.
      const inCompetition =
        classroom.changesCategoryWith(changes.grade) && (await this.classrooms.isInCompetition(id))

      const updated = classroom.update(changes, { facts, inCompetition, now: new Date() })
      if (updated.isLeft()) return left(ClassroomRefusal.http(updated.value, this.i18n))

      await this.classrooms.save(classroom)

      const detail = await this.classrooms.findDetail(id)
      if (!detail) return left(this.notFound())

      return right(detail)
    } catch (error) {
      // A checagem acima não fecha a corrida: o segundo de dois pedidos
      // simultâneos esbarra no `unique` do banco.
      if (isUniqueViolation(error)) return left(ClassroomRefusal.race(error, this.i18n))

      logger.error({ err: error }, '[administrator/classrooms > update][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_CLASSROOM_UPDATE_ERROR',
        ),
      )
    }
  }

  private notFound(): HTTPException {
    return HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND')
  }
}
