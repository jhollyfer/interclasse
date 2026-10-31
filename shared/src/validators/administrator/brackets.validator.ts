import { BRACKET_STATUSES } from '../../enums/bracket-status.js'
import { CATEGORIES } from '../../enums/category.js'
import { pageFields, z } from '../../validator.js'

/**
 * The bracket, as the panel draws and lists it. Mirror (path and name) of the VineJS one in
 * `backend/app/validators/administrator/brackets.validator.ts`
 * (`_standards/architecture.md` §10). The rest of the bracket - teams, groups and
 * matches - comes from the enrollments and the draw.
 */
export const AdministratorBracketCreateValidator = z.object({
  sportId: z.uuid(),
  category: z.enum(CATEGORIES),
})

/** The draw preview asks the same as the draw. */
export const AdministratorBracketPreviewValidator = z.object({
  sportId: z.uuid(),
  category: z.enum(CATEGORIES),
})

export const AdministratorBracketPaginateValidator = z.object({
  ...pageFields(),
  sportId: z.uuid().optional(),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(BRACKET_STATUSES).optional(),
})

export type AdministratorBracketCreatePayload = z.infer<
  typeof AdministratorBracketCreateValidator
>

export type AdministratorBracketPreviewPayload = z.infer<
  typeof AdministratorBracketPreviewValidator
>

export type AdministratorBracketPaginatePayload = z.infer<
  typeof AdministratorBracketPaginateValidator
>
