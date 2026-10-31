import { vine, pageFields, matchFilterFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * What the site accepts in the query. **No `trashed`**: nothing here has a trash, and the
 * parameter would be accepted and silently ignored.
 */
export const StorefrontMatchPaginateValidator = vine.create({
  ...pageFields(),
  ...matchFilterFields(),
})

export type StorefrontMatchPaginatePayload = Infer<typeof StorefrontMatchPaginateValidator>
