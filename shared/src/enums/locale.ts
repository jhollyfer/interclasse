/**
 * The product languages (`_standards/i18n.md` §1). `pt-BR` is the base: no URL
 * prefix, and the fallback when detection fails. A new language is added here,
 * never in an `if`.
 */
export const LOCALE = {
  PT_BR: 'pt-BR',
  ES: 'es',
  EN: 'en',
} as const

export type Locale = (typeof LOCALE)[keyof typeof LOCALE]

export const LOCALES = Object.values(LOCALE)

export const BASE_LOCALE: Locale = LOCALE.PT_BR

/** Record content that exists in the three languages, read by `localized()` in the frontend. */
export type LocalizedText = Record<Locale, string>
