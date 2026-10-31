import { ACTIVE_STATUSES } from '../../enums/active-status.js'
import { CATEGORIES } from '../../enums/category.js'
import { USER_ROLES } from '../../enums/user-role.js'
import { z } from '../../validator.js'

const datetime = () => z.iso.datetime({ offset: true })

/**
 * The account as a classroom link: advisor or representative, without the avatar.
 * Never carries the password (`_standards/architecture.md` §10).
 */
export const AdministratorClassroomPersonResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(USER_ROLES),
  status: z.enum(ACTIVE_STATUSES),
  avatarId: z.uuid().nullable(),
  createdAt: datetime(),
  updatedAt: datetime().nullable(),
  deletedAt: datetime().nullable(),
})

/** The classroom with who advises and who represents it, as the panel reads it. */
export const AdministratorClassroomShowResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  grade: z.number().int(),
  category: z.enum(CATEGORIES),
  advisorId: z.uuid().nullable(),
  representativeId: z.uuid().nullable(),
  createdAt: datetime(),
  updatedAt: datetime().nullable(),
  advisor: AdministratorClassroomPersonResponse.nullable(),
  representative: AdministratorClassroomPersonResponse.nullable(),
})

/** Each item of the panel list: the classroom and the card totals. */
export const AdministratorClassroomPaginateResponse =
  AdministratorClassroomShowResponse.extend({
    studentsCount: z.number().int(),
    athletesCount: z.number().int(),
    sportsCount: z.number().int(),
  })

export type AdministratorClassroomPersonResponse = z.infer<
  typeof AdministratorClassroomPersonResponse
>

export type AdministratorClassroomShowResponse = z.infer<
  typeof AdministratorClassroomShowResponse
>

export type AdministratorClassroomPaginateResponse = z.infer<
  typeof AdministratorClassroomPaginateResponse
>
