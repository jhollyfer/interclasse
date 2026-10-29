import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import Bracket from '#models/bracket'
import Sport from '#models/sport'
import type { Infer } from '#core/validator'
import { type DrawPreviewResponse } from '#core/openapi/response'
import { MAX_TEAMS } from '#features/_shared.tournament'
import HTTPException from '#exceptions/http.exception'
import type { BracketPreviewPayload } from '#features/administrator/brackets/brackets.validator'

type Payload = BracketPreviewPayload
type Response = Either<HTTPException, Infer<typeof DrawPreviewResponse>>

/**
 * A prévia do sorteio: as turmas da categoria e quantos atletas cada uma
 * inscreveu na modalidade. Entra quem chegou ao mínimo - a mesma regra do
 * `POST /administrator/brackets`.
 */
@inject()
export default class AdministratorBracketPreviewUseCase {
  async execute({ sportId, category }: Payload): Promise<Response> {
    try {
      const sport = await Sport.find(sportId)

      if (!sport)
        return left(
          HTTPException.UnprocessableEntity('Modalidade não encontrada', 'SPORT_NOT_FOUND', {
            sportId: 'Modalidade não encontrada',
          }),
        )

      const rows: Array<{ id: string; name: string; grade: number; athletes: string | number }> =
        await db
          .from('classrooms')
          .leftJoin('students', 'students.classroom_id', 'classrooms.id')
          .leftJoin('enrollments', (join) => {
            join
              .on('enrollments.student_id', '=', 'students.id')
              .andOnVal('enrollments.sport_id', '=', sport.id)
          })
          .where('classrooms.category', category)
          .groupBy('classrooms.id', 'classrooms.name', 'classrooms.grade')
          .orderBy('classrooms.grade', 'asc')
          .orderBy('classrooms.name', 'asc')
          .select('classrooms.id', 'classrooms.name', 'classrooms.grade')
          .count('enrollments.id as athletes')

      const drawn = await Bracket.query()
        .where('sportId', sport.id)
        .where('category', category)
        .first()

      return right({
        minAthletes: sport.minAthletes,
        maxTeams: MAX_TEAMS,
        drawn: drawn !== null,
        classrooms: rows.map((row) => {
          const athletes = Number(row.athletes)

          return {
            id: row.id,
            name: row.name,
            athletes,
            eligible: athletes >= sport.minAthletes,
          }
        }),
      })
    } catch (error) {
      logger.error({ err: error }, '[brackets > preview][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_BRACKET_PREVIEW_ERROR',
        ),
      )
    }
  }
}
