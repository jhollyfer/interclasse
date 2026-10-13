import { vine, LIST_LIMITS } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const SPORT_SORT_COLUMNS = ['name', 'createdAt'] as const

export function athletes() {
  return vine.number().withoutDecimals().min(1).max(LIST_LIMITS.ATHLETES)
}

export const SportCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60),
  minAthletes: athletes(),
  maxAthletes: athletes(),
})

export const SportUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60).optional(),
  minAthletes: athletes().optional(),
  maxAthletes: athletes().optional(),
})

export type SportCreatePayload = Readonly<Infer<typeof SportCreateValidator>>
export type SportUpdatePayload = Readonly<Infer<typeof SportUpdateValidator>>
