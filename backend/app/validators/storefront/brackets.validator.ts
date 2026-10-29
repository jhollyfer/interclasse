import { CATEGORIES } from '@interclasse/shared'

import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const StorefrontBracketPaginateValidator = vine.create({
  ...pageFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
})

export type StorefrontBracketPaginatePayload = Infer<typeof StorefrontBracketPaginateValidator>
