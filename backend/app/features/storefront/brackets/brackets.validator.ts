import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'
import { CATEGORIES } from '#core/entity'

export const BracketPaginateValidator = vine.create({
  ...pageFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
})

export type BracketPaginatePayload = Infer<typeof BracketPaginateValidator>
