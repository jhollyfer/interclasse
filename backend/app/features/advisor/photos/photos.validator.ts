import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const PhotoCreateValidator = vine.create({
  storageId: vine.string().uuid(),
  caption: vine.string().trim().maxLength(200).nullable().optional(),
})

export const PhotoPaginateValidator = vine.create({
  ...pageFields(),
})

export type PhotoCreatePayload = Infer<typeof PhotoCreateValidator>

export type PhotoPaginatePayload = Infer<typeof PhotoPaginateValidator>
