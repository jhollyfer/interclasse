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
import { isUniqueViolation } from '#features/_shared.database'
import type { AdministratorBracketCreatePayload } from '#validators/administrator/brackets.validator'

type Payload = AdministratorBracketCreatePayload
/** `created` falso quando a chave já existia: o controller responde 200, não 201. */
type Drawn = { bracket: AdministratorBracketCreateResponse; created: boolean }
type Response = Either<HTTPException, Drawn>

/**
 * O sorteio: a entidade monta a chave de mata-mata inteira, da primeira fase à
 * final, e o repository a grava.
 *
 * Tudo numa unidade de trabalho, com a linha da modalidade travada: a inscrição
 * trava a mesma linha antes de gravar, então uma lista salva no meio do sorteio
 * não entra depois da leitura das turmas. Uma chave com metade das partidas
 * gravadas seria pior que nenhuma, porque travaria as inscrições.
 *
 * Idempotente pela chave natural, modalidade e categoria (índice único em
 * `brackets`): sortear de novo devolve a chave já sorteada, sem erro e sem novo
 * sorteio (_standards/backend.md §4.11). É o que deixa o navegador repetir o
 * pedido quando a rede cai depois do commit. Refazer o sorteio continua sendo
 * apagar e sortear.
 */
@inject()
export default class AdministratorBracketCreateUseCase {
  /** Aleatoriedade criptográfica: um sorteio previsível seria um sorteio contestável. */
  private static readonly random: Random = (max) => randomInt(max)

  constructor(
    private readonly brackets: BracketRepository,
    private readonly unit: UnitOfWork,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return await this.unit.run(() => this.draw(payload))
    } catch (error) {
      // Dois sorteios ao mesmo tempo: o segundo esbarra no `unique` de
      // modalidade e categoria, e a resposta é a mesma do sorteio repetido.
      if (isUniqueViolation(error)) {
        const existing = await this.existing(payload)
        if (existing) return right(existing)
      }

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

    await this.brackets.save(drawn.value)

    return right({ bracket: BracketPresenter.created(drawn.value, sport), created: true })
  }

  /** A chave que o sorteio concorrente gravou primeiro. */
  private async existing(payload: Payload): Promise<Drawn | null> {
    const sport = await this.brackets.findSport(payload.sportId)
    const bracket = await this.brackets.findBySportAndCategory(payload.sportId, payload.category)
    if (!sport || !bracket) return null

    return { bracket: BracketPresenter.created(bracket, sport), created: false }
  }
}
