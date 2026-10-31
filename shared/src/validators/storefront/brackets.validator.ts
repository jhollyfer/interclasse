import { CATEGORIES } from '../../enums/category.js'
import { pageFields, z } from '../../validator.js'

/** The brackets on the site: no status filter, the site only shows what was drawn. */
export const StorefrontBracketPaginateValidator = z.object({
  ...pageFields(),
  sportId: z.uuid().optional(),
  category: z.enum(CATEGORIES).optional(),
})

export type StorefrontBracketPaginatePayload = z.infer<
  typeof StorefrontBracketPaginateValidator
>
