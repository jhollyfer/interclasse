import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import { ClassroomRefusal } from '../_shared.classroom-refusal.ts'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Apaga a turma de vez. Sem lixeira: turma é cadastro da organização, refeito
 * em segundos, e alunos e inscrições vão junto por `CASCADE`. A turma que já está
 * numa chave sorteada fica (regra da entidade).
 */
@inject()
export default class AdministratorClassroomDeleteUseCase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const classroom = await this.classrooms.findById(id)
      if (!classroom)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
        )

      const removable = classroom.remove({
        inCompetition: await this.classrooms.isInCompetition(id),
      })
      if (removable.isLeft()) return left(ClassroomRefusal.http(removable.value, this.i18n))

      await this.classrooms.delete(classroom)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[administrator/classrooms > delete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_CLASSROOM_DELETE_ERROR',
        ),
      )
    }
  }
}
