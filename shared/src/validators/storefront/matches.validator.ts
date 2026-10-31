import { pageFields, z } from '../../validator.js'
import { matchFilterFields } from '../administrator/matches.validator.js'

/**
 * What the site accepts in the query. **No `trashed`**: nothing here has a trash, and
 * the parameter would be accepted and silently ignored.
 */
export const StorefrontMatchPaginateValidator = z.object({
  ...pageFields(),
  ...matchFilterFields(),
})

export type StorefrontMatchPaginatePayload = z.infer<
  typeof StorefrontMatchPaginateValidator
>
