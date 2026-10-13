import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

/**
 * A agenda. **Divergência deliberada do backend**, pelo mesmo motivo de
 * `wireDate()`: lá é `vine.date({ formats: ['iso8601'] })`; aqui o valor é o
 * texto que o campo `datetime-local` produz, convertido para ISO com fuso na
 * hora de enviar.
 */
export const MatchUpdateValidator = vine.create({
  scheduledAt: vine.string().trim().maxLength(40).nullable().optional(),
  location: vine.string().trim().maxLength(120).nullable().optional(),
})

export const MatchScoreValidator = vine.create({
  homeScore: vine.number().withoutDecimals().min(0).max(999),
  awayScore: vine.number().withoutDecimals().min(0).max(999),
  winnerTeamId: vine.string().uuid().optional(),
})

export type MatchUpdatePayload = Infer<typeof MatchUpdateValidator>
export type MatchScorePayload = Infer<typeof MatchScoreValidator>
