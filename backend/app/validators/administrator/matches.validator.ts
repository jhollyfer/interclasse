import { DateTime } from 'luxon'

import { vine, pageFields, matchFilterFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const AdministratorMatchPaginateValidator = vine.create({
  ...pageFields(),
  ...matchFilterFields(),
})

/** Date and time with offset: `2026-11-03T14:30:00-04:00` or `...T18:30:00.000Z`. */
const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/

/**
 * ISO 8601 **with offset**, and not `vine.date({ formats: ['iso8601'] })`.
 *
 * VineJS's `iso8601` falls to a loose `dayjs(value)` when the strict format
 * fails, and accepts any text JavaScript's `Date` understands:
 * `03/11/2026 14:30` became March 11th, and `2026-11-03` without offset, midnight
 * UTC. dayjs' strict format, in turn, does not read an offset. Hence the text is
 * checked here and converted by Luxon, which respects the received offset.
 */
const isoDateTimeRule = vine.createRule((value: unknown, _options: undefined, field) => {
  if (typeof value !== 'string') return
  if (ISO_DATE_TIME.test(value) && DateTime.fromISO(value).isValid) return

  // The phrase lives in the `core/validator.ts` catalog (key `isoDateTime`), in the three languages.
  field.report('Informe {{ field }}', 'isoDateTime', field)
})

/** The schedule field: ISO with offset, `null` unschedules, absent leaves it alone. */
export function scheduledAt() {
  return vine
    .string()
    .use(isoDateTimeRule())
    .meta({ format: 'date-time' })
    .nullable()
    .optional()
    .transform((value): DateTime | null | undefined => {
      // VineJS does not call the `transform` with the field absent, but the optional field
      // type is `T | undefined`: the return says the three states.
      if (value === undefined) return undefined
      if (value === null) return null

      return DateTime.fromISO(value)
    })
}

/**
 * The match schedule. The school plays in local time, and the server saves in
 * UTC; `null` unschedules.
 */
export const AdministratorMatchUpdateValidator = vine.create({
  scheduledAt: scheduledAt(),
  location: vine.string().trim().maxLength(120).nullable().optional(),
})

/**
 * The score. `winnerTeamId` is only read in a tied knockout - the winner on
 * penalties; in any other case the score decides on its own.
 */
export const AdministratorMatchScoreValidator = vine.create({
  homeScore: vine.number().withoutDecimals().min(0).max(999),
  awayScore: vine.number().withoutDecimals().min(0).max(999),
  winnerTeamId: vine.string().uuid().optional(),
})

export type AdministratorMatchPaginatePayload = Infer<typeof AdministratorMatchPaginateValidator>

export type AdministratorMatchUpdatePayload = Infer<typeof AdministratorMatchUpdateValidator>

export type AdministratorMatchScorePayload = Infer<typeof AdministratorMatchScoreValidator>
