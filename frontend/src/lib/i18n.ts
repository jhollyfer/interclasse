import type { LocalizedText } from '@interclasse/shared'

import { getLocale } from '#/paraglide/runtime'

/**
 * O que depende do idioma atual e não é mensagem (`i18n.md` §2): conteúdo de
 * registro nos três idiomas, número e moeda. Texto de interface é `m.*()`;
 * rótulo de enum é `lib/labels.ts`.
 */

/**
 * O fuso da escola. Toda data do painel e do site é mostrada nele, e não no
 * fuso do navegador nem em UTC: a página renderiza no SSR, e a mesma hora em
 * dois fusos diverge na hidratação - além de mostrar 13h para um jogo das 9h.
 */
export const SCHOOL_TIME_ZONE = 'America/Manaus'

/** A moeda do produto: o `formatCurrency` de uma escola brasileira. */
const CURRENCY = 'BRL'

/** O texto do idioma atual de um conteúdo que existe nos três. */
export function localized(text: LocalizedText): string {
  return text[getLocale()]
}

/**
 * Número no idioma atual. Montado a cada uso porque o idioma muda com a URL; o
 * `Intl` guarda o cache dos dados por dentro. Nunca formato montado à mão.
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocale(), options).format(value)
}

/** Valor em reais no idioma atual. */
export function formatCurrency(value: number): string {
  return formatNumber(value, { style: 'currency', currency: CURRENCY })
}
