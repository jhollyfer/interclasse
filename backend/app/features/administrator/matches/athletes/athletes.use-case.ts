import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import Enrollment from '#models/enrollment'
import Match from '#models/match'
import Student from '#models/student'
import type { Infer } from '#core/validator'
import { type MatchAthletesResponse } from '#core/openapi/response'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Infer<typeof MatchAthletesResponse>>

/**
 * Quem pode levar cartão na partida: os alunos das duas turmas, os inscritos na
 * modalidade primeiro.
 */
@inject()
export default class AdministratorMatchAthletesUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const match = await Match.query()
        .where('id', id)
        .preload('bracket')
        .preload('homeTeam', (team) => {
          team.preload('classroom')
        })
        .preload('awayTeam', (team) => {
          team.preload('classroom')
        })
        .first()

      if (!match) return left(HTTPException.NotFound('Partida não encontrada', 'MATCH_NOT_FOUND'))

      const teams = [match.homeTeam, match.awayTeam].filter((team) => team !== null)
      const students = await Student.query()
        .whereIn(
          'classroomId',
          teams.map((team) => team.classroomId),
        )
        .orderBy('name', 'asc')
      const enrolled = await Enrollment.query()
        .where('sportId', match.bracket.sportId)
        .whereIn(
          'studentId',
          students.map((student) => student.id),
        )
      const athletes = new Set(enrolled.map((enrollment) => enrollment.studentId))

      return right({
        teams: teams.map((team) => ({
          teamId: team.id,
          classroomId: team.classroomId,
          name: team.classroom.name,
          students: students
            .filter((student) => student.classroomId === team.classroomId)
            .map((student) => ({
              id: student.id,
              name: student.name,
              enrolled: athletes.has(student.id),
            }))
            .sort((a, b) => Number(b.enrolled) - Number(a.enrolled)),
        })),
      })
    } catch (error) {
      logger.error({ err: error }, '[matches > athletes][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_MATCH_ATHLETES_ERROR',
        ),
      )
    }
  }
}
