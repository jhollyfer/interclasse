import { BRACKET_STATUSES, CATEGORIES } from '@interclasse/shared'

import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * O que `POST /administrator/brackets` recebe: qual competição sortear. O resto
 * - times, grupos e partidas - sai das inscrições e do sorteio.
 */
export const BracketCreateValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

/** A prévia do sorteio pergunta o mesmo que o sorteio. */
export const BracketPreviewValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

export const BracketPaginateValidator = vine.create({
  ...pageFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
  status: vine.enum(BRACKET_STATUSES).optional(),
})

export type BracketCreatePayload = Infer<typeof BracketCreateValidator>

export type BracketPaginatePayload = Infer<typeof BracketPaginateValidator>

export type BracketPreviewPayload = Infer<typeof BracketPreviewValidator>
