import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const ANNOUNCEMENT_SORT_COLUMNS = ['title', 'createdAt'] as const

export const AdministratorAnnouncementCreateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(160),
  body: vine.string().trim().minLength(1).maxLength(5000),
  pinned: vine.boolean().optional(),
})

export const AdministratorAnnouncementUpdateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(160).optional(),
  body: vine.string().trim().minLength(1).maxLength(5000).optional(),
  pinned: vine.boolean().optional(),
})

export type AdministratorAnnouncementCreatePayload = Infer<
  typeof AdministratorAnnouncementCreateValidator
>
export type AdministratorAnnouncementUpdatePayload = Infer<
  typeof AdministratorAnnouncementUpdateValidator
>
