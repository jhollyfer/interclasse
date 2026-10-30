/**
 * Os idiomas do produto (`_standards/i18n.md` §1). `pt-BR` é a base: sem prefixo
 * na URL e o fallback quando a detecção falha. Idioma novo entra aqui, nunca
 * num `if`.
 */
export const LOCALE = {
  PT_BR: 'pt-BR',
  ES: 'es',
  EN: 'en',
} as const

export type Locale = (typeof LOCALE)[keyof typeof LOCALE]

export const LOCALES = Object.values(LOCALE)

export const BASE_LOCALE: Locale = LOCALE.PT_BR
