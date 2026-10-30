import { m } from '#/paraglide/messages'

/**
 * O que identifica o site nos metadados de toda rota.
 *
 * Constantes num arquivo só porque aparecem nos dois lados: no
 * `head` da raiz, que é o padrão, e no `head` das rotas de detalhe, que caem
 * nele quando o registro não tem capa. Escrevê-las nos dois lugares garantiria
 * que o cartão do link de uma notícia sem capa anunciasse outra coisa que a
 * home.
 */

/**
 * O nome do evento, e o que fica no fim de todo título.
 *
 * O título de cada rota é `<assunto> | Jogos Estudantis`, montado no `head` da própria
 * rota: o TanStack Router não tem template de título como o `metadata` do Next,
 * então o sufixo é composto onde o título nasce.
 */
export const SITE_TITLE = m.common_site_title

/** A descrição da raiz, herdada por rota que não escreva a sua. */
export const SITE_DESCRIPTION = m.common_site_description

/**
 * O endereço público do site, sem barra no fim. É a base do `canonical` e dos
 * `hreflang`, que precisam de URL absoluta; o SSR não tem como descobri-la.
 */
export const SITE_URL = 'https://interclass.maiyu.com.br'

/**
 * O fuso da escola. Toda data do painel e do site é mostrada nele, e não no
 * fuso do navegador nem em UTC: a página renderiza no SSR, e a mesma hora em
 * dois fusos diverge na hidratação - além de mostrar 13h para um jogo das 9h.
 */
export const SCHOOL_TIME_ZONE = 'America/Manaus'
