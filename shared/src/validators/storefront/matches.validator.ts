import { pageFields, z } from '../../validator.js'
import { matchFilterFields } from '../administrator/matches.validator.js'

/**
 * O que o site aceita na query. **Sem `trashed`**: nada daqui tem lixeira, e o
 * parâmetro seria aceito e ignorado em silêncio.
 */
export const StorefrontMatchPaginateValidator = z.object({
  ...pageFields(),
  ...matchFilterFields(),
})

export type StorefrontMatchPaginatePayload = z.infer<
  typeof StorefrontMatchPaginateValidator
>
