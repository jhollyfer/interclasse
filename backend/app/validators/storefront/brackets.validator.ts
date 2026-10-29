import { CATEGORIES } from '@interclasse/shared'

import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const BracketPaginateValidator = vine.create({
  ...pageFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
})

export type BracketPaginatePayload = Infer<typeof BracketPaginateValidator>
