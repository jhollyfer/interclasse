import { BRACKET_STATUSES, CATEGORIES } from '@interclasse/shared'

import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * O que `POST /administrator/brackets` recebe: qual competição sortear. O resto
 * - times, grupos e partidas - sai das inscrições e do sorteio.
 */
export const AdministratorBracketCreateValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

/** A prévia do sorteio pergunta o mesmo que o sorteio. */
export const AdministratorBracketPreviewValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

export const AdministratorBracketPaginateValidator = vine.create({
  ...pageFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
  status: vine.enum(BRACKET_STATUSES).optional(),
})

export type AdministratorBracketCreatePayload = Infer<typeof AdministratorBracketCreateValidator>

export type AdministratorBracketPaginatePayload = Infer<
  typeof AdministratorBracketPaginateValidator
>

export type AdministratorBracketPreviewPayload = Infer<typeof AdministratorBracketPreviewValidator>
