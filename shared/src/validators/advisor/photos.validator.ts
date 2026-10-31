import { pageFields, z } from '../../validator.js'

/**
 * The advisor's photo: the same upload as the panel, and the list is only theirs, so
 * it does not filter by status. Mirror of the VineJS one in
 * `backend/app/validators/advisor/photos.validator.ts`.
 */
export const AdvisorPhotoCreateValidator = z.object({
  storageId: z.uuid(),
  caption: z.string().trim().max(200).nullable().optional(),
})

export const AdvisorPhotoPaginateValidator = z.object({
  ...pageFields(),
})

export type AdvisorPhotoCreatePayload = z.infer<
  typeof AdvisorPhotoCreateValidator
>

export type AdvisorPhotoPaginatePayload = z.infer<
  typeof AdvisorPhotoPaginateValidator
>
