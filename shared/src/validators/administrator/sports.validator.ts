import { LIST_LIMITS, paginationFields, sortFields, z } from '../../validator.js'

/**
 * A modalidade, como o painel a cadastra. Par de caminho e nome do VineJS de
 * `backend/app/validators/administrator/sports.validator.ts`
 * (`_standards/architecture.md` §10). Que o mínimo não passe do máximo é regra
 * da entidade, não do formulário.
 */
export const SPORT_SORT_COLUMNS = ['name', 'createdAt'] as const

const athletes = () => z.number().int().min(1).max(LIST_LIMITS.ATHLETES)

export const AdministratorSportCreateValidator = z.object({
  name: z.string().trim().min(1).max(60),
  minAthletes: athletes(),
  maxAthletes: athletes(),
})

export const AdministratorSportUpdateValidator = AdministratorSportCreateValidator.partial()

export const AdministratorSportPaginateValidator = z.object({
  ...paginationFields(),
  ...sortFields(SPORT_SORT_COLUMNS),
})

export type AdministratorSportCreatePayload = z.infer<typeof AdministratorSportCreateValidator>

export type AdministratorSportUpdatePayload = z.infer<typeof AdministratorSportUpdateValidator>

export type AdministratorSportPaginatePayload = z.infer<
  typeof AdministratorSportPaginateValidator
>
