import type {
  ActiveStatus,
  BracketStatus,
  CardColor,
  Category,
  MatchPhase,
  MatchStatus,
  PhotoStatus,
  StorageMimetype,
  UploadStatus,
  UserRole,
} from '@interclasse/shared'
import type { VariantProps } from 'class-variance-authority'

import type { badgeVariants } from '#/components/ui/badge'
import { m } from '#/paraglide/messages'

import {
  formatNumber,
  formatSchoolDate,
  schoolDateTime,
  schoolInputToIso,
} from './i18n'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

/**
 * The labels (in the screen's language, read on each access) and the colors of each
 * domain enum. Each label is a `get` that calls `m.*()`: `LABELS[value]` remains
 * the way to use it and returns the text in the current language.
 *
 * Separate from `validator.ts` on purpose: there it is the contract with the API, and the enum
 * value is an identifier, not interface text. Here it is presentation.
 *
 * A lookup object and not an `if` scattered across screens - and the same object feeds three
 * things: the form's `<option>`s, the table text and the `Badge`
 * variant.
 *
 * The key is `string` and the value may be missing because the status arrives from the API as a
 * wide `string`. `satisfies` is what keeps the demand to have them all: a new
 * enum value without a label here does not compile. Access is always
 * `LABELS[value] ?? value`, which shows the raw identifier instead of breaking.
 */
export const ACTIVE_STATUS_LABELS: Record<string, string | undefined> = {
  get ACTIVE() {
    return m.label_active_status_active()
  },
  get INACTIVE() {
    return m.label_active_status_inactive()
  },
} satisfies Record<ActiveStatus, string>

export const ACTIVE_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
} satisfies Record<ActiveStatus, BadgeVariant>

/**
 * The same enum, in the agreement of someone speaking of a person: the account is "Ativo", the
 * category is "Ativa". They are two labels that differ only by the vowel, and that is why
 * the backend stores the value in English.
 */
export const ACCOUNT_STATUS_LABELS: Record<string, string | undefined> = {
  get ACTIVE() {
    return m.label_account_status_active()
  },
  get INACTIVE() {
    return m.label_account_status_inactive()
  },
} satisfies Record<ActiveStatus, string>

/**
 * The status's solid color, for the form dot.
 *
 * Separate from `*_VARIANTS`, which is the `Badge`'s pale-background/dark-ink pair: the
 * pale background at 8px in the middle of a white field cannot be seen. The dot uses the
 * **ink** of the same pair, which is solid and survives the size.
 */
export const ACTIVE_STATUS_DOTS: Record<string, string | undefined> = {
  ACTIVE: 'bg-badge-success-foreground',
  INACTIVE: 'bg-muted-foreground',
} satisfies Record<ActiveStatus, string>

/** One role per responsibility in the games. */
export const USER_ROLE_LABELS: Record<string, string | undefined> = {
  get ADMINISTRATOR() {
    return m.label_role_administrator()
  },
  get ADVISOR() {
    return m.label_role_advisor()
  },
  get REPRESENTATIVE() {
    return m.label_role_representative()
  },
} satisfies Record<UserRole, string>

export const USER_ROLE_VARIANTS: Record<string, BadgeVariant> = {
  ADMINISTRATOR: 'info',
  ADVISOR: 'success',
  REPRESENTATIVE: 'neutral',
} satisfies Record<UserRole, BadgeVariant>

export const CATEGORY_LABELS: Record<string, string | undefined> = {
  get F1() {
    return m.label_category_f1()
  },
  get F2() {
    return m.label_category_f2()
  },
} satisfies Record<Category, string>

/** The short form, for a table column and a tab. */
export const CATEGORY_SHORT_LABELS: Record<string, string | undefined> = {
  get F1() {
    return m.label_category_short_f1()
  },
  get F2() {
    return m.label_category_short_f2()
  },
} satisfies Record<Category, string>

export const BRACKET_STATUS_LABELS: Record<string, string | undefined> = {
  get KNOCKOUT() {
    return m.label_bracket_status_knockout()
  },
  get FINISHED() {
    return m.label_bracket_status_finished()
  },
} satisfies Record<BracketStatus, string>

export const BRACKET_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  KNOCKOUT: 'warning',
  FINISHED: 'success',
} satisfies Record<BracketStatus, BadgeVariant>

export const PHOTO_STATUS_LABELS: Record<string, string | undefined> = {
  get PENDING() {
    return m.label_photo_status_pending()
  },
  get APPROVED() {
    return m.label_photo_status_approved()
  },
  get REJECTED() {
    return m.label_photo_status_rejected()
  },
} satisfies Record<PhotoStatus, string>

export const PHOTO_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
} satisfies Record<PhotoStatus, BadgeVariant>

export const MATCH_PHASE_LABELS: Record<string, string | undefined> = {
  get ROUND_OF_16() {
    return m.label_match_phase_round_of_16()
  },
  get QUARTER() {
    return m.label_match_phase_quarter()
  },
  get SEMI() {
    return m.label_match_phase_semi()
  },
  get FINAL() {
    return m.label_match_phase_final()
  },
} satisfies Record<MatchPhase, string>

export const MATCH_STATUS_LABELS: Record<string, string | undefined> = {
  get SCHEDULED() {
    return m.label_match_status_scheduled()
  },
  get FINISHED() {
    return m.label_match_status_finished()
  },
} satisfies Record<MatchStatus, string>

export const MATCH_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  SCHEDULED: 'neutral',
  FINISHED: 'success',
} satisfies Record<MatchStatus, BadgeVariant>

export const CARD_COLOR_LABELS: Record<string, string | undefined> = {
  get YELLOW() {
    return m.label_card_color_yellow()
  },
  get RED() {
    return m.label_card_color_red()
  },
} satisfies Record<CardColor, string>

/** The card's own color, for the rectangle that represents it on screen. */
export const CARD_COLOR_CLASSES: Record<string, string | undefined> = {
  YELLOW: 'bg-yellow-400',
  RED: 'bg-red-600',
} satisfies Record<CardColor, string>

/**
 * A file's state in the library.
 *
 * `PENDING` is not "aguardando aprovação": it is an upload that opened and did not confirm, and
 * the file cannot be attached to anything in that state. The label says so, otherwise the
 * screen promises a file that the backend refuses.
 */
export const UPLOAD_STATUS_LABELS: Record<string, string | undefined> = {
  get PENDING() {
    return m.label_upload_status_pending()
  },
  get UPLOADED() {
    return m.label_upload_status_uploaded()
  },
} satisfies Record<UploadStatus, string>

export const UPLOAD_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  UPLOADED: 'success',
} satisfies Record<UploadStatus, BadgeVariant>

export const UPLOAD_STATUS_DOTS: Record<string, string | undefined> = {
  PENDING: 'bg-badge-warning-foreground',
  UPLOADED: 'bg-badge-success-foreground',
} satisfies Record<UploadStatus, string>

/**
 * A file's type, in the way it is spoken of.
 *
 * "JPEG" and not "image/jpeg": the mimetype is a protocol identifier, and whoever
 * picks a filter looks for the format, not the HTTP header. The raw value
 * remains what travels in the URL and in the body.
 */
export const STORAGE_MIMETYPE_LABELS: Record<string, string | undefined> = {
  get 'image/jpeg'() {
    return m.label_mimetype_jpeg()
  },
  get 'image/png'() {
    return m.label_mimetype_png()
  },
  get 'image/webp'() {
    return m.label_mimetype_webp()
  },
  get 'image/gif'() {
    return m.label_mimetype_gif()
  },
  get 'application/pdf'() {
    return m.label_mimetype_pdf()
  },
  get 'audio/mpeg'() {
    return m.label_mimetype_mp3()
  },
  get 'audio/mp4'() {
    return m.label_mimetype_mp4()
  },
  get 'audio/ogg'() {
    return m.label_mimetype_ogg()
  },
  get 'audio/wav'() {
    return m.label_mimetype_wav()
  },
} satisfies Record<StorageMimetype, string>

/**
 * A name's initials, for the avatar without an image.
 *
 * First letter of the first name and of the last. **A one-word name returns
 * one initial**: repeating the first as a surname would give "MM" for "Matheus".
 *
 * An absent name returns an empty string, and not a "?": whoever wants a marker
 * writes `initials(name) || '?'` - the fallback is the screen's decision, and
 * `AvatarFallback` already knows how to stay empty.
 */
export function initials(name: string | undefined | null): string {
  if (!name?.trim()) return ''

  const parts = name.trim().split(/\s+/)
  const first = parts.at(0)?.at(0) ?? ''

  let last = ''
  if (parts.length > 1) last = parts.at(-1)?.at(0) ?? ''

  return first.concat(last).toUpperCase()
}

/**
 * A date in the school's time zone, and not with the browser's `toLocaleString()`: the dashboard
 * renders on SSR, and the same date formatted in two time zones is a hydration
 * divergence on the first render. Luxon with `setZone`/`setLocale` in
 * `lib/i18n.ts`.
 */
export function formatDate(value: string | null): string {
  if (!value) return '-'

  return formatSchoolDate(value, { dateStyle: 'short', timeStyle: 'short' })
}

/** "08:30", or the empty clock of someone who has no time yet. */
export function formatTime(value: string | null): string {
  if (!value) return '--:--'

  return formatSchoolDate(value, { hour: '2-digit', minute: '2-digit' })
}

/** "sexta-feira, 16 de outubro": a day's title in the agenda. */
export function formatDay(value: string): string {
  return formatSchoolDate(value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** The day on the school's clock, `YYYY-MM-DD`: groups matches of the same day. */
export function formatDayKey(value: string): string {
  return schoolDateTime(value).toFormat('yyyy-MM-dd')
}

/** "sex., 16/10, 08:30", or the notice that the time is not out yet. */
export function formatWhen(value: string | null): string {
  if (!value) return m.label_when_undefined()

  return formatSchoolDate(value, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * API ISO to the value of a `datetime-local`, on the SCHOOL's clock.
 *
 * Not on the browser's: whoever scheduled from another time zone (Acre, the interior of
 * Amazonas) typed 08:30 and the table showed 09:30, because the display was already
 * in the school's time zone and the input was not.
 */
export function toSchoolInput(value: string | null): string {
  if (!value) return ''

  return schoolDateTime(value).toFormat("yyyy-MM-dd'T'HH:mm")
}

/** The inverse: `2026-12-14T08:30` on the school's clock to ISO. */
export function fromSchoolInput(value: string): string {
  return schoolInputToIso(value)
}

/**
 * A file's size in a readable unit.
 *
 * Base 1024 and one decimal place, which is what the `backend` counts in
 * `UPLOAD_MAX_SIZE` and what file managers show. It stops climbing at
 * MB on purpose: the project's per-file cap is far from a gigabyte, and
 * a unit that never shows up is a branch that is never exercised.
 *
 * It lives here, and not in the upload queue that debuted it: the file library
 * shows the same number in the column and in the detail, and two implementations
 * would diverge at the first rounding change.
 */
/** One fixed decimal place: "1,5 MB", and not "1,5 MB" at one size and "2 MB" at another. */
const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 }

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`

  const kb = bytes / 1024
  if (kb < 1024) return `${formatNumber(kb, ONE_DECIMAL)} KB`

  return `${formatNumber(kb / 1024, ONE_DECIMAL)} MB`
}

/**
 * Agrees the noun with the count, and returns both together.
 *
 * It exists because the same condition was written as a ternary on seven screens -
 * `total === 1 ? '1 foto' : `${total} fotos`` - and the `no-ternary` rule in
 * `eslint.config.js` forbids it. Writing an `if` in each of them would be the same
 * duplication with more lines.
 *
 * An irregular plural is not derived from the singular, so both forms go in, already
 * translated by the caller: `plural(3, m.photo_one(), m.photo_other())`. A whole
 * sentence with a count is a message with a plural variant, not this function.
 * Whoever needs only the noun, without the number in front, passes `withCount: false`.
 */
export function plural(
  count: number,
  singular: string,
  plural_: string,
  { withCount = true }: { withCount?: boolean } = {},
): string {
  let word = plural_
  if (count === 1) word = singular

  if (!withCount) return word

  return `${formatNumber(count)} ${word}`
}

/** The champion classroom: whoever won the final. Null until the final happens. */
export function championName(bracket: {
  championTeamId: string | null
  matches: ReadonlyArray<{
    homeTeamId: string | null
    awayTeamId: string | null
    homeName: string | null
    awayName: string | null
  }>
}): string | null {
  if (!bracket.championTeamId) return null

  // Any of the champion's matches will do: the name is the same in all of them.
  const match = bracket.matches.find(
    (item) =>
      item.homeTeamId === bracket.championTeamId ||
      item.awayTeamId === bracket.championTeamId,
  )
  if (!match) return null
  if (match.homeTeamId === bracket.championTeamId) return match.homeName

  return match.awayName
}
