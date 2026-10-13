import { vine, paginationFields } from '#core/validator'
import type { Infer } from '#core/validator'
import { BRACKET_STATUSES, CATEGORIES } from '#core/entity'

/**
 * O que `POST /administrator/brackets` recebe: qual competição sortear. O resto
 * - times, grupos e partidas - sai das inscrições e do sorteio.
 */
export const AdministratorBracketCreateValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

export const AdministratorBracketPaginationValidator = vine.create({
  ...paginationFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
  status: vine.enum(BRACKET_STATUSES).optional(),
})

export type AdministratorBracketCreatePayload = Infer<typeof AdministratorBracketCreateValidator>

export type AdministratorBracketPaginationPayload = Infer<
  typeof AdministratorBracketPaginationValidator
>
