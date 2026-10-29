import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import {
  BRACKET_STATUS,
  MATCH_PHASE,
  left,
  right,
  type Either,
  type MatchPhase,
} from '@interclasse/shared'

import Bracket from '#models/bracket'
import Match from '#models/match'
import Sport from '#models/sport'
import Team from '#models/team'
import {
  MAX_TEAMS,
  advanceSlot,
  bracketSize,
  drawKnockout,
  knockoutPhase,
  nextPhase,
} from '#features/_shared.tournament'
import HTTPException from '#exceptions/http.exception'
import { isUniqueViolation } from '#features/_shared.database'
import type { BracketCreatePayload } from '#features/administrator/brackets/brackets.validator'

type Payload = BracketCreatePayload
/** `created` falso quando a chave já existia: o controller responde 200, não 201. */
type Drawn = { bracket: Bracket; created: boolean }
type Response = Either<HTTPException, Drawn>

/** Com menos de dois times não há partida a jogar. */
const MIN_TEAMS = 2

/**
 * O sorteio: monta a chave de mata-mata inteira, da primeira fase à final.
 *
 * Tudo numa transação: uma chave com metade das partidas gravadas seria pior
 * que nenhuma, porque travaria as inscrições.
 *
 * Idempotente pela chave natural, modalidade e categoria (índice único em
 * `brackets`): sortear de novo devolve a chave já sorteada, sem erro e sem novo
 * sorteio (_standards/backend.md §4.11). É o que deixa o navegador repetir o
 * pedido quando a rede cai depois do commit - antes, o administrador via erro e
 * a chave já existia. Refazer o sorteio continua sendo apagar e sortear.
 */
@inject()
export default class AdministratorBracketCreateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const sport = await Sport.find(payload.sportId)

      if (!sport)
        return left(
          HTTPException.UnprocessableEntity('Modalidade não encontrada', 'SPORT_NOT_FOUND', {
            sportId: 'Modalidade não encontrada',
          }),
        )

      // Tudo na mesma transação, com a linha da modalidade travada: a
      // inscrição trava a mesma linha antes de gravar. Sem isso, uma lista
      // salva no meio do sorteio entrava depois da leitura das turmas e ficava
      // fora de uma chave que já tinha fechado as inscrições.
      const drawn = await db.transaction(async (trx): Promise<Response> => {
        await Sport.query({ client: trx }).where('id', sport.id).forUpdate().first()

        const existing = await Bracket.query({ client: trx })
          .where('sportId', sport.id)
          .where('category', payload.category)
          .first()

        if (existing) return right({ bracket: existing, created: false })

        // As turmas da categoria com inscritos suficientes para formar time.
        const eligible: Array<{ id: string }> = await trx
          .from('classrooms')
          .join('students', 'students.classroom_id', 'classrooms.id')
          .join('enrollments', 'enrollments.student_id', 'students.id')
          .where('classrooms.category', payload.category)
          .where('enrollments.sport_id', sport.id)
          .groupBy('classrooms.id')
          .havingRaw('count(enrollments.id) >= ?', [sport.minAthletes])
          .select('classrooms.id')

        if (eligible.length < MIN_TEAMS)
          return left(
            HTTPException.Conflict(
              `São necessárias ao menos ${MIN_TEAMS} turmas com ${sport.minAthletes} atletas inscritos`,
              'NOT_ENOUGH_TEAMS',
            ),
          )

        if (eligible.length > MAX_TEAMS)
          return left(
            HTTPException.Conflict(`A chave comporta até ${MAX_TEAMS} turmas`, 'TOO_MANY_TEAMS'),
          )

        const pairings = drawKnockout(eligible.map((classroom) => classroom.id))
        const created = await Bracket.create(
          { sportId: sport.id, category: payload.category, status: BRACKET_STATUS.KNOCKOUT },
          { client: trx },
        )

        await this.createMatches(created.id, pairings, trx)

        return right({ bracket: created, created: true })
      })

      if (drawn.isLeft()) return drawn

      await drawn.value.bracket.load('sport')

      return drawn
    } catch (error) {
      // Dois sorteios ao mesmo tempo: o segundo esbarra no `unique` de
      // modalidade e categoria, e a resposta é a mesma do sorteio repetido.
      if (isUniqueViolation(error)) return this.existing(payload)

      logger.error({ err: error }, '[brackets > create][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_BRACKET_CREATE_ERROR',
        ),
      )
    }
  }

  /** A chave que o sorteio concorrente gravou primeiro. */
  private async existing(payload: Payload): Promise<Response> {
    const bracket = await Bracket.query()
      .where('sportId', payload.sportId)
      .where('category', payload.category)
      .preload('sport')
      .firstOrFail()

    return right({ bracket, created: false })
  }

  /**
   * As partidas da chave inteira. As fases seguintes nascem vazias e vão
   * sendo preenchidas pelos vencedores; o time de folga já entra na fase
   * seguinte, no lugar onde o vencedor do confronto dele entraria.
   */
  private async createMatches(
    bracketId: string,
    pairings: Array<{ home: string; away: string | null }>,
    trx: TransactionClientContract,
  ): Promise<void> {
    const teams = new Map<string, string>()
    const classrooms = pairings.flatMap((pairing) => {
      if (pairing.away) return [pairing.home, pairing.away]

      return [pairing.home]
    })
    const created = await Team.createMany(
      classrooms.map((classroomId) => ({ bracketId, classroomId })),
      { client: trx },
    )
    for (const team of created) teams.set(team.classroomId, team.id)

    let phase: MatchPhase | undefined = knockoutPhase(bracketSize(classrooms.length))
    let round = 1
    let size = pairings.length
    const advanced = new Map<number, { home?: string; away?: string }>()
    // Gravadas num `createMany` só, no fim: um INSERT por partida eram até 15
    // idas ao banco com a linha da modalidade travada.
    const matches: Array<Partial<Match>> = []

    // Primeira fase: só os confrontos de verdade; a folga sobe direto.
    for (const [position, pairing] of pairings.entries()) {
      const home = teams.get(pairing.home)
      if (!pairing.away) {
        const slot = advanceSlot(position)
        advanced.set(slot.position, { ...advanced.get(slot.position), [slot.side]: home })
        continue
      }

      matches.push({
        bracketId,
        phase: phase ?? MATCH_PHASE.FINAL,
        round,
        position,
        homeTeamId: home,
        awayTeamId: teams.get(pairing.away),
      })
    }

    phase = phase && nextPhase(phase)
    size /= 2

    while (phase) {
      round += 1
      for (let position = 0; position < size; position++) {
        const filled = advanced.get(position)
        matches.push({
          bracketId,
          phase,
          round,
          position,
          homeTeamId: filled?.home ?? null,
          awayTeamId: filled?.away ?? null,
        })
      }

      advanced.clear()
      phase = nextPhase(phase)
      size /= 2
    }

    await Match.createMany(matches, { client: trx })
  }
}
