import { vine, notNull, LIST_LIMITS, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const SPORT_SORT_COLUMNS = ['name', 'createdAt'] as const

/**
 * Atletas por time. Que o mínimo não passe do máximo é regra da entidade
 * (`app/domain/sport/sport.entity.ts`). Par de caminho e nome do Zod de
 * `shared/src/validators/administrator/sports.validator.ts`.
 */
function athletes() {
  return vine.number().withoutDecimals().min(1).max(LIST_LIMITS.ATHLETES)
}

export const AdministratorSportCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60),
  minAthletes: athletes(),
  maxAthletes: athletes(),
})

export const AdministratorSportUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60).optional().use(notNull()),
  minAthletes: athletes().optional().use(notNull()),
  maxAthletes: athletes().optional().use(notNull()),
})

export const AdministratorSportPaginateValidator = vine.create({
  ...paginationFields(),
  ...sortFields(SPORT_SORT_COLUMNS),
})

export type AdministratorSportCreatePayload = Infer<typeof AdministratorSportCreateValidator>

export type AdministratorSportUpdatePayload = Infer<typeof AdministratorSportUpdateValidator>

export type AdministratorSportPaginatePayload = Infer<typeof AdministratorSportPaginateValidator>
