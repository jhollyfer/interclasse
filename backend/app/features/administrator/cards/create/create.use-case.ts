import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import Match from '#models/match'
import MatchCard from '#models/match-card'
import Student from '#models/student'
import Team from '#models/team'
import CardService from '#services/card/card.service'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorCardCreatePayload } from '#validators/administrator/cards.validator'

type Payload = AdministratorCardCreatePayload
type Response = Either<HTTPException, MatchCard>

/**
 * Lança um cartão. O atleta tem que ser de uma das duas turmas da partida: o
 * time do cartão sai daí, e não do corpo.
 */
@inject()
export default class AdministratorCardCreateUseCase {
  constructor(private readonly cards: CardService) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const match = await Match.find(payload.matchId)

      if (!match)
        return left(
          HTTPException.UnprocessableEntity('Partida não encontrada', 'MATCH_NOT_FOUND', {
            matchId: 'Partida não encontrada',
          }),
        )

      if (!match.homeTeamId || !match.awayTeamId)
        return left(
          HTTPException.Conflict(
            'A partida ainda não tem os dois times definidos',
            'MATCH_TEAMS_PENDING',
          ),
        )

      const student = await Student.find(payload.studentId)
      const team = await Team.query()
        .whereIn('id', [match.homeTeamId, match.awayTeamId])
        .where('classroomId', student?.classroomId ?? '')
        .first()

      if (!student || !team)
        return left(
          HTTPException.UnprocessableEntity('Atleta fora da partida', 'STUDENT_NOT_IN_MATCH', {
            studentId: 'Selecione um atleta de uma das duas turmas da partida',
          }),
        )

      const card = await MatchCard.create({
        matchId: match.id,
        teamId: team.id,
        studentId: student.id,
        color: payload.color,
        note: payload.note ?? null,
      })

      const loaded = await this.cards.list({}).where('id', card.id).first()

      return right(loaded ?? card)
    } catch (error) {
      logger.error({ err: error }, '[cards > create][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_CARD_CREATE_ERROR',
        ),
      )
    }
  }
}
