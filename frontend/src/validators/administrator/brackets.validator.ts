import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'
import { CATEGORIES } from '#/lib/entity'

export const BracketCreateValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

export type BracketCreatePayload = Infer<
  typeof BracketCreateValidator
>
