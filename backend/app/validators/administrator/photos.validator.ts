import { PHOTO_REVIEW_STATUSES, PHOTO_STATUSES } from '@interclasse/shared'

import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * Mirror (path and name) of the Zod one in
 * `shared/src/validators/administrator/photos.validator.ts`.
 */
export const AdministratorPhotoCreateValidator = vine.create({
  storageId: vine.string().uuid(),
  caption: vine.string().trim().maxLength(200).nullable().optional(),
})

export const AdministratorPhotoPaginateValidator = vine.create({
  ...pageFields(),
  status: vine.enum(PHOTO_STATUSES).optional(),
})

export const AdministratorPhotoReviewValidator = vine.create({
  status: vine.enum(PHOTO_REVIEW_STATUSES),
})

export type AdministratorPhotoCreatePayload = Infer<typeof AdministratorPhotoCreateValidator>

export type AdministratorPhotoPaginatePayload = Infer<typeof AdministratorPhotoPaginateValidator>

export type AdministratorPhotoReviewPayload = Infer<typeof AdministratorPhotoReviewValidator>
