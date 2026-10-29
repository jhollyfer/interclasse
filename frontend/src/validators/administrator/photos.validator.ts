import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

/** Espelho de `backend/app/features/administrator/photos/photos.validator.ts`. */
export const PhotoCreateValidator = vine.create({
  storageId: vine.string().uuid(),
  caption: vine.string().trim().maxLength(200).nullable().optional(),
})

export const PhotoReviewValidator = vine.create({
  status: vine.enum(['APPROVED', 'REJECTED'] as const),
})

export type PhotoCreatePayload = Infer<typeof PhotoCreateValidator>

export type PhotoReviewPayload = Infer<typeof PhotoReviewValidator>
