import {
  LIST_LIMITS,
  paginationFields,
  sortFields,
  z,
} from '../../validator.js'

/**
 * The sport, as the panel registers it. Mirror (path and name) of the VineJS one in
 * `backend/app/validators/administrator/sports.validator.ts`
 * (`_standards/architecture.md` §10). That the minimum does not exceed the maximum is
 * an entity rule, not a form one.
 */
export const SPORT_SORT_COLUMNS = ['name', 'createdAt'] as const

const athletes = () => z.number().int().min(1).max(LIST_LIMITS.ATHLETES)

export const AdministratorSportCreateValidator = z.object({
  name: z.string().trim().min(1).max(60),
  minAthletes: athletes(),
  maxAthletes: athletes(),
})

export const AdministratorSportUpdateValidator =
  AdministratorSportCreateValidator.partial()

export const AdministratorSportPaginateValidator = z.object({
  ...paginationFields(),
  ...sortFields(SPORT_SORT_COLUMNS),
})

export type AdministratorSportCreatePayload = z.infer<
  typeof AdministratorSportCreateValidator
>

export type AdministratorSportUpdatePayload = z.infer<
  typeof AdministratorSportUpdateValidator
>

export type AdministratorSportPaginatePayload = z.infer<
  typeof AdministratorSportPaginateValidator
>
