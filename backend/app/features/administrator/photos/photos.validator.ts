import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'
import { PHOTO_REVIEW_STATUSES, PHOTO_STATUSES } from '#core/entity'

export const PhotoCreateValidator = vine.create({
  storageId: vine.string().uuid(),
  caption: vine.string().trim().maxLength(200).nullable().optional(),
})

export const PhotoPaginateValidator = vine.create({
  ...pageFields(),
  status: vine.enum(PHOTO_STATUSES).optional(),
})

export const PhotoReviewValidator = vine.create({
  status: vine.enum(PHOTO_REVIEW_STATUSES),
})

export type PhotoCreatePayload = Infer<typeof PhotoCreateValidator>

export type PhotoPaginatePayload = Infer<typeof PhotoPaginateValidator>

export type PhotoReviewPayload = Infer<typeof PhotoReviewValidator>
