import { vine, notNull, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const ANNOUNCEMENT_SORT_COLUMNS = ['title', 'createdAt'] as const

export const AnnouncementCreateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(160),
  body: vine.string().trim().minLength(1).maxLength(5000),
  pinned: vine.boolean().optional(),
})

export const AnnouncementUpdateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(160).optional().use(notNull()),
  body: vine.string().trim().minLength(1).maxLength(5000).optional().use(notNull()),
  pinned: vine.boolean().optional().use(notNull()),
})

export const AnnouncementPaginateValidator = vine.create({
  ...paginationFields(),
  ...sortFields(ANNOUNCEMENT_SORT_COLUMNS),
})

export type AnnouncementCreatePayload = Infer<typeof AnnouncementCreateValidator>

export type AnnouncementUpdatePayload = Infer<typeof AnnouncementUpdateValidator>

export type AnnouncementPaginatePayload = Infer<typeof AnnouncementPaginateValidator>
