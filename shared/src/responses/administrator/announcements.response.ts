import { z } from '../../validator.js'

/**
 * The announcement as the API returns it: in detail, create, update and each list
 * item (`_standards/architecture.md` §10). Dates in ISO 8601, the transport type.
 */
export const AdministratorAnnouncementShowResponse = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  pinned: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
})

export type AdministratorAnnouncementShowResponse = z.infer<
  typeof AdministratorAnnouncementShowResponse
>
