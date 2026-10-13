import { vine, paginationFields, matchFilterFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const AdministratorMatchPaginationValidator = vine.create({
  ...paginationFields(),
  ...matchFilterFields(),
})

/**
 * A agenda da partida. `scheduledAt` em ISO 8601 com fuso: a escola joga no
 * horário local, e o servidor grava em UTC.
 */
export const AdministratorMatchUpdateValidator = vine.create({
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
export const AdministratorMatchScoreValidator = vine.create({
  homeScore: vine.number().withoutDecimals().min(0).max(999),
  awayScore: vine.number().withoutDecimals().min(0).max(999),
  winnerTeamId: vine.string().uuid().optional(),
})

export type AdministratorMatchPaginationPayload = Infer<
  typeof AdministratorMatchPaginationValidator
>

export type AdministratorMatchUpdatePayload = Infer<typeof AdministratorMatchUpdateValidator>

export type AdministratorMatchScorePayload = Infer<typeof AdministratorMatchScoreValidator>
