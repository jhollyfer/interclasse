import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'
import { CATEGORIES } from '#/lib/entity'

export const AdministratorBracketCreateValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

export type AdministratorBracketCreatePayload = Infer<
  typeof AdministratorBracketCreateValidator
>
