import { vine, notNull, LIST_LIMITS, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const SPORT_SORT_COLUMNS = ['name', 'createdAt'] as const

/** Atletas por time. Que o mínimo não passe do máximo é checado no use-case. */
export function athletes() {
  return vine.number().withoutDecimals().min(1).max(LIST_LIMITS.ATHLETES)
}

export const SportCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60),
  minAthletes: athletes(),
  maxAthletes: athletes(),
})

export const SportUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60).optional().use(notNull()),
  minAthletes: athletes().optional().use(notNull()),
  maxAthletes: athletes().optional().use(notNull()),
})

export const SportPaginateValidator = vine.create({
  ...paginationFields(),
  ...sortFields(SPORT_SORT_COLUMNS),
})

export type SportCreatePayload = Infer<typeof SportCreateValidator>

export type SportUpdatePayload = Infer<typeof SportUpdateValidator>

export type SportPaginatePayload = Infer<typeof SportPaginateValidator>
