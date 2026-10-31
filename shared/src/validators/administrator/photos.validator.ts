import {
  PHOTO_REVIEW_STATUSES,
  PHOTO_STATUSES,
} from '../../enums/photo-status.js'
import { pageFields, z } from '../../validator.js'

/**
 * The carousel photo, as the panel uploads, lists and reviews it. Mirror (path and
 * name) of the VineJS one in `backend/app/validators/administrator/photos.validator.ts`
 * (`_standards/architecture.md` §10).
 */
export const AdministratorPhotoCreateValidator = z.object({
  storageId: z.uuid(),
  caption: z.string().trim().max(200).nullable().optional(),
})

export const AdministratorPhotoPaginateValidator = z.object({
  ...pageFields(),
  status: z.enum(PHOTO_STATUSES).optional(),
})

export const AdministratorPhotoReviewValidator = z.object({
  status: z.enum(PHOTO_REVIEW_STATUSES),
})

export type AdministratorPhotoCreatePayload = z.infer<
  typeof AdministratorPhotoCreateValidator
>

export type AdministratorPhotoPaginatePayload = z.infer<
  typeof AdministratorPhotoPaginateValidator
>

export type AdministratorPhotoReviewPayload = z.infer<
  typeof AdministratorPhotoReviewValidator
>
