import { randomInt, randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorBracketCreateResponse,
  type Either,
} from '@interclasse/shared'

import { BracketPresenter } from '../brackets.presenter.ts'
import { BracketRefusal } from '../_shared.bracket-refusal.ts'

import { Bracket } from '#domain/bracket/bracket.entity'
import type { Random } from '#domain/shared/knockout.value-object'
import { BracketRepository } from '#repositories/bracket/bracket.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorBracketCreatePayload } from '#validators/administrator/brackets.validator'

type Payload = AdministratorBracketCreatePayload
/** `created` false when the bracket already existed: the controller responds 200, not 201. */
type Drawn = { bracket: AdministratorBracketCreateResponse; created: boolean }
type Response = Either<HTTPException, Drawn>

/**
 * The draw: the entity builds the whole knockout bracket, from the first phase to the
 * final, and the repository saves it.
 *
 * All in one unit of work, with the sport row locked: the enrollment
 * locks the same row before saving, so a list saved in the middle of the draw
 * does not enter after the classrooms were read. A bracket with half of the matches
 * saved would be worse than none, because it would lock the enrollments.
 *
 * Idempotent by the natural key, sport and category (unique index on
 * `brackets`): drawing again returns the already drawn bracket, with no error and no new
 * draw (_standards/backend.md §4.11). It is what lets the browser repeat the
 * request when the network drops after the commit. Redoing the draw remains
 * deleting and drawing.
 */
@inject()
export default class AdministratorBracketCreateUseCase {
  /** Cryptographic randomness: a predictable draw would be a contestable draw. */
  private static readonly random: Random = (max) => randomInt(max)

  constructor(
    private readonly brackets: BracketRepository,
    private readonly unit: UnitOfWork,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const result = await this.unit.run(() => this.draw(payload))

      // Two simultaneous draws: the second loses on the sport and category `unique`
      // (`save` returns the fact), and the response is the same as the repeated draw.
      if (result.isLeft() && result.value.code === 'BRACKET_ALREADY_EXISTS') {
        const existing = await this.existing(payload)
        if (existing) return right(existing)
      }

      return result
    } catch (error) {
      logger.error({ err: error }, '[administrator/brackets > create][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_BRACKET_CREATE_ERROR',
        ),
      )
    }
  }

  private async draw(payload: Payload): Promise<Response> {
    const sport = await this.brackets.lockSport(payload.sportId)
    if (!sport)
      return left(
        HTTPException.UnprocessableEntity(
          this.i18n.t('brackets.sport_not_found'),
          'SPORT_NOT_FOUND',
          { sportId: this.i18n.t('brackets.sport_not_found') },
        ),
      )

    const existing = await this.brackets.findBySportAndCategory(sport.id, payload.category)
    if (existing)
      return right({ bracket: BracketPresenter.created(existing, sport), created: false })

    const drawn = Bracket.draw({
      id: randomUUID(),
      sportId: sport.id,
      category: payload.category,
      minAthletes: sport.minAthletes,
      classroomIds: await this.brackets.eligibleClassroomIds(
        sport.id,
        payload.category,
        sport.minAthletes,
      ),
      newId: () => randomUUID(),
      random: AdministratorBracketCreateUseCase.random,
      now: new Date(),
    })
    if (drawn.isLeft()) return left(BracketRefusal.http(drawn.value, this.i18n))

    const saved = await this.brackets.save(drawn.value)
    if (saved.isLeft()) return left(BracketRefusal.http(saved.value, this.i18n))

    return right({ bracket: BracketPresenter.created(drawn.value, sport), created: true })
  }

  /** The bracket that the concurrent draw saved first. */
  private async existing(payload: Payload): Promise<Drawn | null> {
    const sport = await this.brackets.findSport(payload.sportId)
    const bracket = await this.brackets.findBySportAndCategory(payload.sportId, payload.category)
    if (!sport || !bracket) return null

    return { bracket: BracketPresenter.created(bracket, sport), created: false }
  }
}
