import { DateTime } from 'luxon'

import { vine, pageFields, matchFilterFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const AdministratorMatchPaginateValidator = vine.create({
  ...pageFields(),
  ...matchFilterFields(),
})

/** Data e hora com fuso: `2026-11-03T14:30:00-04:00` ou `...T18:30:00.000Z`. */
const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/

/**
 * ISO 8601 **com fuso**, e não `vine.date({ formats: ['iso8601'] })`.
 *
 * O `iso8601` do VineJS cai no `dayjs(value)` solto quando o formato estrito
 * falha, e aceita qualquer texto que o `Date` do JavaScript entenda:
 * `03/11/2026 14:30` virava 11 de março, e `2026-11-03` sem fuso, meia-noite
 * UTC. O formato estrito do dayjs, por sua vez, não lê fuso. Daí o texto
 * conferido aqui e convertido pelo Luxon, que respeita o fuso recebido.
 */
const isoDateTimeRule = vine.createRule((value: unknown, _options: undefined, field) => {
  if (typeof value !== 'string') return
  if (ISO_DATE_TIME.test(value) && DateTime.fromISO(value).isValid) return

  field.report('Informe data e hora em ISO 8601 com fuso', 'isoDateTime', field)
})

/** O campo da agenda: ISO com fuso, `null` desmarca, ausente não mexe. */
export function scheduledAt() {
  return vine
    .string()
    .use(isoDateTimeRule())
    .meta({ format: 'date-time' })
    .nullable()
    .optional()
    .transform((value): DateTime | null | undefined => {
      // O VineJS não chama o `transform` com o campo ausente, mas o tipo do campo
      // opcional é `T | undefined`: o retorno diz os três estados.
      if (value === undefined) return undefined
      if (value === null) return null

      return DateTime.fromISO(value)
    })
}

/**
 * A agenda da partida. A escola joga no horário local, e o servidor grava em
 * UTC; `null` desmarca.
 */
export const AdministratorMatchUpdateValidator = vine.create({
  scheduledAt: scheduledAt(),
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

export type AdministratorMatchPaginatePayload = Infer<typeof AdministratorMatchPaginateValidator>

export type AdministratorMatchUpdatePayload = Infer<typeof AdministratorMatchUpdateValidator>

export type AdministratorMatchScorePayload = Infer<typeof AdministratorMatchScoreValidator>
