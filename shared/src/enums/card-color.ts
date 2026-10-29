/** A cor do cartão que um atleta levou numa partida. */
export const CARD_COLOR = {
  YELLOW: 'YELLOW',
  RED: 'RED',
} as const

export type CardColor = (typeof CARD_COLOR)[keyof typeof CARD_COLOR]

export const CARD_COLORS = Object.values(CARD_COLOR)
