import type { z } from '../../validator.js'
import { AdministratorAnnouncementShowResponse } from '../administrator/announcements.response.js'

/**
 * O aviso no site: a mesma forma do painel. Nada nele é privado - aviso é
 * público por natureza.
 */
export const StorefrontAnnouncementShowResponse =
  AdministratorAnnouncementShowResponse

export type StorefrontAnnouncementShowResponse = z.infer<
  typeof StorefrontAnnouncementShowResponse
>
