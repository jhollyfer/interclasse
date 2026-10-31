import type { LocalizedText } from '@interclasse/shared'
import { DateTime } from 'luxon'

import { getLocale } from '#/paraglide/runtime'

/**
 * What depends on the current language and is not a message (`i18n.md` §2): record
 * content in the three languages, number and currency. Interface text is `m.*()`;
 * the enum label is `lib/labels.ts`.
 */

/**
 * The school's time zone. Every dashboard and site date is shown in it, and not in the
 * browser's time zone or UTC: the page renders on SSR, and the same time in
 * two zones diverges at hydration - besides showing 1pm for a 9am match.
 */
export const SCHOOL_TIME_ZONE = 'America/Manaus'

/** The product's currency: the `formatCurrency` of a Brazilian school. */
const CURRENCY = 'BRL'

/** The text in the current language of content that exists in all three. */
export function localized(text: LocalizedText): string {
  return text[getLocale()]
}

/**
 * A number in the current language. Built on each use because the language changes with the URL;
 * `Intl` keeps the data cache internally. Never a hand-built format.
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocale(), options).format(value)
}

/** A value in reais in the current language. */
export function formatCurrency(value: number): string {
  return formatNumber(value, { style: 'currency', currency: CURRENCY })
}

/**
 * The API instant on the school's clock and in the current language (`frontend.md` §3.5):
 * explicit `setZone` and `setLocale` of the URL's language. The browser's time zone would make
 * SSR and hydration render different strings.
 */
export function schoolDateTime(value: string): DateTime {
  return DateTime.fromISO(value)
    .setZone(SCHOOL_TIME_ZONE)
    .setLocale(getLocale())
}

/**
 * The current year on the school's clock. Read in the route's `loader`, and not in the
 * render: `new Date()` in render diverges between SSR and hydration at the turn of the
 * year (`frontend.md` §3.2).
 */
export function currentSchoolYear(): number {
  return DateTime.now().setZone(SCHOOL_TIME_ZONE).year
}

/** The API date formatted on the school's clock and in the current language. */
export function formatSchoolDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return schoolDateTime(value).toLocaleString(options)
}

/** `2026-12-14T08:30` on the school's clock to ISO in UTC. */
export function schoolInputToIso(value: string): string {
  return (
    DateTime.fromISO(value, { zone: SCHOOL_TIME_ZONE }).toUTC().toISO() ?? ''
  )
}
