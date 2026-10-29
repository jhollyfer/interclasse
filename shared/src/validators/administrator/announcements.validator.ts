import { paginationFields, sortFields, z } from '../../validator.js'

/**
 * O aviso, como o painel o publica. Par de caminho e nome do VineJS de
 * `backend/app/validators/administrator/announcements.validator.ts`
 * (`_standards/architecture.md` §10).
 */
export const ANNOUNCEMENT_SORT_COLUMNS = ['title', 'createdAt'] as const

export const AdministratorAnnouncementCreateValidator = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(5000),
  pinned: z.boolean().optional(),
})

export const AdministratorAnnouncementUpdateValidator =
  AdministratorAnnouncementCreateValidator.partial()

export const AdministratorAnnouncementPaginateValidator = z.object({
  ...paginationFields(),
  ...sortFields(ANNOUNCEMENT_SORT_COLUMNS),
})

export type AdministratorAnnouncementCreatePayload = z.infer<
  typeof AdministratorAnnouncementCreateValidator
>

export type AdministratorAnnouncementUpdatePayload = z.infer<
  typeof AdministratorAnnouncementUpdateValidator
>

export type AdministratorAnnouncementPaginatePayload = z.infer<
  typeof AdministratorAnnouncementPaginateValidator
>
