import { BRACKET_STATUSES, CATEGORIES } from '@interclasse/shared'

import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * What `POST /administrator/brackets` receives: which competition to draw. The rest
 * - teams, groups and matches - comes from the enrollments and the draw.
 */
export const AdministratorBracketCreateValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

/** The draw preview asks the same as the draw. */
export const AdministratorBracketPreviewValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

export const AdministratorBracketPaginateValidator = vine.create({
  ...pageFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
  status: vine.enum(BRACKET_STATUSES).optional(),
})

export type AdministratorBracketCreatePayload = Infer<typeof AdministratorBracketCreateValidator>

export type AdministratorBracketPaginatePayload = Infer<
  typeof AdministratorBracketPaginateValidator
>

export type AdministratorBracketPreviewPayload = Infer<typeof AdministratorBracketPreviewValidator>
