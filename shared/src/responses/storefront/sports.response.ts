import type { z } from '../../validator.js'
import { AdministratorSportShowResponse } from '../administrator/sports.response.js'

/**
 * The sport on the site: the same shape as the panel. Nothing in it is private -
 * name and athlete limits are public by nature.
 */
export const StorefrontSportShowResponse = AdministratorSportShowResponse

export type StorefrontSportShowResponse = z.infer<
  typeof StorefrontSportShowResponse
>
