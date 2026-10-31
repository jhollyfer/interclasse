import type { z } from '../../validator.js'
import { AdministratorAnnouncementShowResponse } from '../administrator/announcements.response.js'

/**
 * The announcement on the site: the same shape as the panel. Nothing in it is
 * private - an announcement is public by nature.
 */
export const StorefrontAnnouncementShowResponse =
  AdministratorAnnouncementShowResponse

export type StorefrontAnnouncementShowResponse = z.infer<
  typeof StorefrontAnnouncementShowResponse
>
