import { BRACKET_STATUSES } from '../../enums/bracket-status.js'
import { CATEGORIES } from '../../enums/category.js'
import { pageFields, z } from '../../validator.js'

/**
 * A chave, como o painel a sorteia e a lista. Par de caminho e nome do VineJS de
 * `backend/app/validators/administrator/brackets.validator.ts`
 * (`_standards/architecture.md` §10). O resto da chave - times, grupos e
 * partidas - sai das inscrições e do sorteio.
 */
export const AdministratorBracketCreateValidator = z.object({
  sportId: z.uuid(),
  category: z.enum(CATEGORIES),
})

/** A prévia do sorteio pergunta o mesmo que o sorteio. */
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
