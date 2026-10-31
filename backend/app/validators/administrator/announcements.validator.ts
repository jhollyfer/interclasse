import { vine, notNull, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * The announcement, as the panel publishes it. Mirror (path and name) of the Zod one in
 * `shared/src/validators/administrator/announcements.validator.ts`.
 */
export const ANNOUNCEMENT_SORT_COLUMNS = ['title', 'createdAt'] as const

export const AdministratorAnnouncementCreateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(160),
  body: vine.string().trim().minLength(1).maxLength(5000),
  pinned: vine.boolean().optional(),
})

export const AdministratorAnnouncementUpdateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(160).optional().use(notNull()),
  body: vine.string().trim().minLength(1).maxLength(5000).optional().use(notNull()),
  pinned: vine.boolean().optional().use(notNull()),
})

export const AdministratorAnnouncementPaginateValidator = vine.create({
  ...paginationFields(),
  ...sortFields(ANNOUNCEMENT_SORT_COLUMNS),
})

export type AdministratorAnnouncementCreatePayload = Infer<
  typeof AdministratorAnnouncementCreateValidator
>

export type AdministratorAnnouncementUpdatePayload = Infer<
  typeof AdministratorAnnouncementUpdateValidator
>

export type AdministratorAnnouncementPaginatePayload = Infer<
  typeof AdministratorAnnouncementPaginateValidator
>
