import { vine, pageFields, matchFilterFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const MatchPaginateValidator = vine.create({
  ...pageFields(),
  ...matchFilterFields(),
})

/**
 * A agenda da partida. `scheduledAt` em ISO 8601 com fuso: a escola joga no
 * horário local, e o servidor grava em UTC.
 */
export const MatchUpdateValidator = vine.create({
  scheduledAt: vine
    .date({ formats: ['iso8601'] })
    .nullable()
    .optional(),
  location: vine.string().trim().maxLength(120).nullable().optional(),
})

/**
 * O placar. `winnerTeamId` só é lido no mata-mata empatado - o vencedor nos
 * pênaltis; em qualquer outro caso o placar decide sozinho.
 */
export const MatchScoreValidator = vine.create({
  homeScore: vine.number().withoutDecimals().min(0).max(999),
  awayScore: vine.number().withoutDecimals().min(0).max(999),
  winnerTeamId: vine.string().uuid().optional(),
})

export type MatchPaginatePayload = Infer<typeof MatchPaginateValidator>

export type MatchUpdatePayload = Infer<typeof MatchUpdateValidator>

export type MatchScorePayload = Infer<typeof MatchScoreValidator>
