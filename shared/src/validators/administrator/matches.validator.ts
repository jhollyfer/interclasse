import { CATEGORIES } from '../../enums/category.js'
import { MATCH_PHASES } from '../../enums/match-phase.js'
import { MATCH_STATUSES } from '../../enums/match-status.js'
import { pageFields, z } from '../../validator.js'

/**
 * Os filtros da tabela de jogos, iguais no painel e no site. Par de caminho e
 * nome do VineJS de `backend/app/validators/administrator/matches.validator.ts`.
 */
export function matchFilterFields() {
  return {
    bracketId: z.uuid().optional(),
    // Os jogos de uma turma: a aba "Jogos" do detalhe da turma.
    classroomId: z.uuid().optional(),
    sportId: z.uuid().optional(),
    category: z.enum(CATEGORIES).optional(),
    phase: z.enum(MATCH_PHASES).optional(),
    status: z.enum(MATCH_STATUSES).optional(),
  }
}

export const AdministratorMatchPaginateValidator = z.object({
  ...pageFields(),
  ...matchFilterFields(),
})

/** A agenda da partida: ISO 8601 com fuso, `null` desmarca, ausente não mexe. */
export const AdministratorMatchUpdateValidator = z.object({
  scheduledAt: z.iso.datetime({ offset: true }).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
})

/**
 * O placar. `winnerTeamId` só é lido no mata-mata empatado - o vencedor nos
 * pênaltis; em qualquer outro caso o placar decide sozinho.
 */
export const AdministratorMatchScoreValidator = z.object({
  homeScore: z.number().int().min(0).max(999),
  awayScore: z.number().int().min(0).max(999),
  winnerTeamId: z.uuid().optional(),
})

export type AdministratorMatchPaginatePayload = z.infer<
  typeof AdministratorMatchPaginateValidator
>

export type AdministratorMatchUpdatePayload = z.infer<
  typeof AdministratorMatchUpdateValidator
>

export type AdministratorMatchScorePayload = z.infer<
  typeof AdministratorMatchScoreValidator
>
