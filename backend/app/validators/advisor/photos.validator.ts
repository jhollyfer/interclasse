import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * Mirror (path and name) of the Zod one in
 * `shared/src/validators/advisor/photos.validator.ts`.
 */
export const AdvisorPhotoCreateValidator = vine.create({
  storageId: vine.string().uuid(),
  caption: vine.string().trim().maxLength(200).nullable().optional(),
})

export const AdvisorPhotoPaginateValidator = vine.create({
  ...pageFields(),
})

export type AdvisorPhotoCreatePayload = Infer<typeof AdvisorPhotoCreateValidator>

export type AdvisorPhotoPaginatePayload = Infer<typeof AdvisorPhotoPaginateValidator>
