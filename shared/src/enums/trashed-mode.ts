/**
 * O recorte de lixeira das listagens. Ausente é o de sempre - só ativos -,
 * então nenhuma leitura muda de resposta para quem não pediu.
 *
 * Aqui é `deletedAt`, a remoção lógica.
 */
export const TRASHED_MODE = {
  /** Só o que está na lixeira. É a listagem da tela de restauração. */
  ONLY: 'only',
  /** Ativos e removidos juntos. */
  WITH: 'with',
} as const

export type TrashedMode = (typeof TRASHED_MODE)[keyof typeof TRASHED_MODE]

export const TRASHED_MODES = Object.values(TRASHED_MODE)
