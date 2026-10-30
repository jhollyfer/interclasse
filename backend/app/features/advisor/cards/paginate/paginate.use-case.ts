import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type Actor,
  type AdvisorCardPaginateResponse,
  type Either,
  type Merge,
  type Paginated,
} from '@interclasse/shared'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { MatchCardRepository } from '#repositories/match-card/match-card.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorCardPaginatePayload } from '#validators/advisor/cards.validator'

type Payload = Merge<AdvisorCardPaginatePayload, { actor: Actor }>
type Response = Either<HTTPException, Paginated<AdvisorCardPaginateResponse>>

/**
 * Os cartões que os atletas da turma levaram, do mais novo ao mais antigo. A
 * turma alheia é 404 como a inexistente: a posse vai no critério da consulta
 * (`_standards/domain.md` §5.1), não numa conferência depois.
 */
@inject()
export default class AdvisorCardPaginateUseCase {
  constructor(
    private readonly cards: MatchCardRepository,
    private readonly classrooms: ClassroomRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const classroom = await this.classrooms.findOwned({
        id: payload.classroomId,
        actor: payload.actor,
      })
      if (!classroom)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
        )

      return right(
        await this.cards.paginate({
          classroomId: payload.classroomId,
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[advisor/cards > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_CARD_PAGINATE_ERROR',
        ),
      )
    }
  }
}
