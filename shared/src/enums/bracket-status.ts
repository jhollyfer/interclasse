/**
 * Onde a competição de uma modalidade numa categoria está: em disputa ou
 * encerrada, com campeão.
 *
 * Não existe chave "aberta": antes do sorteio a linha simplesmente não existe,
 * e é a ausência dela que deixa as inscrições abertas.
 */
export const BRACKET_STATUS = {
  KNOCKOUT: 'KNOCKOUT',
  FINISHED: 'FINISHED',
} as const

export type BracketStatus = (typeof BRACKET_STATUS)[keyof typeof BRACKET_STATUS]

export const BRACKET_STATUSES = Object.values(BRACKET_STATUS)
