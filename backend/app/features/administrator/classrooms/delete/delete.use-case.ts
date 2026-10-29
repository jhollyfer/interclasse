import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import Classroom from '#models/classroom'
import Team from '#models/team'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Classroom>

/**
 * Apaga a turma de vez. Sem lixeira: turma é cadastro da organização, refeito
 * em segundos, e alunos e inscrições vão junto por `CASCADE`.
 */
@inject()
export default class AdministratorClassroomDeleteUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.find(id)

      if (!classroom)
        return left(HTTPException.NotFound('Turma não encontrada', 'CLASSROOM_NOT_FOUND'))

      const team = await Team.findBy('classroomId', classroom.id)

      if (team)
        return left(
          HTTPException.Conflict('A turma já está numa chave sorteada', 'CLASSROOM_IN_COMPETITION'),
        )

      await classroom.delete()

      return right(classroom)
    } catch (error) {
      logger.error({ err: error }, '[classrooms > delete][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_CLASSROOM_DELETE_ERROR',
        ),
      )
    }
  }
}
