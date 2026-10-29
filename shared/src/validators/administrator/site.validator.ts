import { z } from '../../validator.js'

/**
 * A configuração do site, como o painel a grava. Par de caminho e nome do
 * VineJS de `backend/app/validators/administrator/site.validator.ts`
 * (`_standards/architecture.md` §10).
 */

/** `@usuario` do Instagram: letras, números, ponto e sublinhado, até 30. */
const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/

/**
 * Tudo opcional e anulável: ausente é "não mexer", `null` apaga. O site esconde
 * o que estiver vazio.
 */
export const AdministratorSiteUpdateValidator = z.object({
  about: z.string().trim().max(4000).nullable().optional(),
  organizer: z.string().trim().max(160).nullable().optional(),
  firstEditionYear: z.number().int().min(1990).max(2100).nullable().optional(),
  edition: z.number().int().min(1).max(99).nullable().optional(),
  schoolInstagram: z.string().trim().regex(INSTAGRAM).nullable().optional(),
  developerInstagram: z.string().trim().regex(INSTAGRAM).nullable().optional(),
  regulationId: z.uuid().nullable().optional(),
})

export type AdministratorSiteUpdatePayload = z.infer<typeof AdministratorSiteUpdateValidator>
