import type { LocalizedText } from '@interclasse/shared'
import { DateTime } from 'luxon'

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

/**
 * O instante da API no relógio da escola e no idioma atual (`frontend.md` §3.5):
 * `setZone` explícito e `setLocale` do idioma da URL. O fuso do navegador faria
 * SSR e hidratação renderizarem strings diferentes.
 */
export function schoolDateTime(value: string): DateTime {
  return DateTime.fromISO(value)
    .setZone(SCHOOL_TIME_ZONE)
    .setLocale(getLocale())
}

/**
 * O ano corrente no relógio da escola. Lido no `loader` da rota, e não no
 * render: `new Date()` no render diverge entre SSR e hidratação na virada do
 * ano (`frontend.md` §3.2).
 */
export function currentSchoolYear(): number {
  return DateTime.now().setZone(SCHOOL_TIME_ZONE).year
}

/** A data da API formatada no relógio da escola e no idioma atual. */
export function formatSchoolDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return schoolDateTime(value).toLocaleString(options)
}

/** `2026-12-14T08:30` no relógio da escola para ISO em UTC. */
export function schoolInputToIso(value: string): string {
  return (
    DateTime.fromISO(value, { zone: SCHOOL_TIME_ZONE }).toUTC().toISO() ?? ''
  )
}
