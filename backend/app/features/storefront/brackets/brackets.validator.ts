import { vine, paginationFields } from '#core/validator'
import type { Infer } from '#core/validator'
import { CATEGORIES } from '#core/entity'

export const StorefrontBracketPaginationValidator = vine.create({
  ...paginationFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
})

export type StorefrontBracketPaginationPayload = Infer<typeof StorefrontBracketPaginationValidator>
