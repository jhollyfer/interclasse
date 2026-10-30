import { CATEGORIES } from '../../enums/category.js'
import { pageFields, z } from '../../validator.js'

/** As chaves no site: sem filtro de status, o site só mostra o que foi sorteado. */
export const StorefrontBracketPaginateValidator = z.object({
  ...pageFields(),
  sportId: z.uuid().optional(),
  category: z.enum(CATEGORIES).optional(),
})

export type StorefrontBracketPaginatePayload = z.infer<typeof StorefrontBracketPaginateValidator>
