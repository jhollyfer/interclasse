import { BRACKET_STATUSES } from '../../enums/bracket-status.js'
import { CATEGORIES } from '../../enums/category.js'
import { MATCH_PHASES } from '../../enums/match-phase.js'
import { MATCH_STATUSES } from '../../enums/match-status.js'
import { z } from '../../validator.js'
import { AdministratorSportShowResponse } from './sports.response.js'

/**
 * A chave como a API devolve (`_standards/architecture.md` §10). Datas em
 * ISO 8601, o tipo de transporte.
 */

/** A chave com a modalidade: a listagem, o sorteio e a partida que a aninha. */
export const AdministratorBracketPaginateResponse = z.object({
  id: z.uuid(),
  sportId: z.uuid(),
  category: z.enum(CATEGORIES),
  status: z.enum(BRACKET_STATUSES),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
  sport: AdministratorSportShowResponse,
})

/** O sorteio devolve a chave da lista; repetido, a mesma que já existia. */
export const AdministratorBracketCreateResponse = AdministratorBracketPaginateResponse

/**
 * A competição inteira, numa resposta: todas as partidas, de cada fase, com os
 * nomes das turmas já resolvidos. É a tela de chave do painel e do site.
 */
export const AdministratorBracketShowResponse = z.object({
  id: z.uuid(),
  category: z.enum(CATEGORIES),
  status: z.enum(BRACKET_STATUSES),
  sport: z.object({ id: z.uuid(), name: z.string(), slug: z.string() }),
  /** Nulo até a chave terminar. */
  championTeamId: z.uuid().nullable(),
  matches: z.array(
    z.object({
      id: z.uuid(),
      phase: z.enum(MATCH_PHASES),
      round: z.number().int(),
      position: z.number().int(),
      status: z.enum(MATCH_STATUSES),
      homeTeamId: z.uuid().nullable(),
      awayTeamId: z.uuid().nullable(),
      homeName: z.string().nullable(),
      awayName: z.string().nullable(),
      homeScore: z.number().int().nullable(),
      awayScore: z.number().int().nullable(),
      winnerTeamId: z.uuid().nullable(),
      scheduledAt: z.iso.datetime({ offset: true }).nullable(),
      location: z.string().nullable(),
    }),
  ),
})

/**
 * O que o sorteio faria agora: cada turma da categoria com quantos atletas tem
 * inscritos na modalidade, e se entra. É o que o diálogo mostra antes de
 * sortear, para a turma de fora não ser surpresa.
 */
export const AdministratorBracketPreviewResponse = z.object({
  minAthletes: z.number().int(),
  maxTeams: z.number().int(),
  /** Já existe chave desta modalidade nesta categoria. */
  drawn: z.boolean(),
  classrooms: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      athletes: z.number().int(),
      eligible: z.boolean(),
    }),
  ),
})

export type AdministratorBracketPaginateResponse = z.infer<
  typeof AdministratorBracketPaginateResponse
>

export type AdministratorBracketCreateResponse = z.infer<typeof AdministratorBracketCreateResponse>

export type AdministratorBracketShowResponse = z.infer<typeof AdministratorBracketShowResponse>

export type AdministratorBracketPreviewResponse = z.infer<
  typeof AdministratorBracketPreviewResponse
>
