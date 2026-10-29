import { vine, pageFields, matchFilterFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * O que o site aceita na query. **Sem `trashed`**: nada daqui tem lixeira, e o
 * parâmetro seria aceito e ignorado em silêncio.
 */
export const MatchPaginateValidator = vine.create({
  ...pageFields(),
  ...matchFilterFields(),
})

export type MatchPaginatePayload = Infer<typeof MatchPaginateValidator>
