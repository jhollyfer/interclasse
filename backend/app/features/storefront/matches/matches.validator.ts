import { vine, paginationFields, matchFilterFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * O que o site aceita na query. **Sem `trashed`**: nada daqui tem lixeira, e o
 * parâmetro seria aceito e ignorado em silêncio.
 */
export const StorefrontMatchPaginationValidator = vine.create({
  ...paginationFields(),
  ...matchFilterFields(),
})

export type StorefrontMatchPaginationPayload = Infer<typeof StorefrontMatchPaginationValidator>
