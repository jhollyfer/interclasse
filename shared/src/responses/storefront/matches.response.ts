import type { z } from '../../validator.js'
import { AdministratorMatchPaginateResponse } from '../administrator/matches.response.js'

/** The match table of the site: the same shape as the panel. */
export const StorefrontMatchPaginateResponse =
  AdministratorMatchPaginateResponse

export type StorefrontMatchPaginateResponse = z.infer<
  typeof StorefrontMatchPaginateResponse
>
