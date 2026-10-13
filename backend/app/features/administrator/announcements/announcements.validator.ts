import { vine, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'

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

export const AdministratorAnnouncementPaginationValidator = vine.create({
  ...paginationFields(),
  ...sortFields(ANNOUNCEMENT_SORT_COLUMNS),
})

export type AdministratorAnnouncementCreatePayload = Infer<
  typeof AdministratorAnnouncementCreateValidator
>

export type AdministratorAnnouncementUpdatePayload = Infer<
  typeof AdministratorAnnouncementUpdateValidator
>

export type AdministratorAnnouncementPaginationPayload = Infer<
  typeof AdministratorAnnouncementPaginationValidator
>
