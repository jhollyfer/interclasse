import type { z } from '../../validator.js'
import { AdministratorCardPaginateResponse } from '../administrator/cards.response.js'

/** The cards of the advisor's classroom: the same shape as the panel. */
export const AdvisorCardPaginateResponse = AdministratorCardPaginateResponse

export type AdvisorCardPaginateResponse = z.infer<
  typeof AdvisorCardPaginateResponse
>
