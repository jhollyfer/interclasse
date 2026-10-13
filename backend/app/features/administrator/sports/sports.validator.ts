import { vine, LIST_LIMITS, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const SPORT_SORT_COLUMNS = ['name', 'createdAt'] as const

/** Atletas por time. Que o mínimo não passe do máximo é checado no use-case. */
export function athletes() {
  return vine.number().withoutDecimals().min(1).max(LIST_LIMITS.ATHLETES)
}

export const AdministratorSportCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60),
  minAthletes: athletes(),
  maxAthletes: athletes(),
})

export const AdministratorSportUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60).optional(),
  minAthletes: athletes().optional(),
  maxAthletes: athletes().optional(),
})

export const AdministratorSportPaginationValidator = vine.create({
  ...paginationFields(),
  ...sortFields(SPORT_SORT_COLUMNS),
})

export type AdministratorSportCreatePayload = Infer<typeof AdministratorSportCreateValidator>

export type AdministratorSportUpdatePayload = Infer<typeof AdministratorSportUpdateValidator>

export type AdministratorSportPaginationPayload = Infer<
  typeof AdministratorSportPaginationValidator
>
