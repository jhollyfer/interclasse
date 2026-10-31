import { z } from '../../validator.js'

/**
 * The site configuration, as the panel writes it. Mirror (path and name) of the
 * VineJS one in `backend/app/validators/administrator/site.validator.ts`
 * (`_standards/architecture.md` §10).
 */

/** Instagram `@handle`: letters, digits, dot and underscore, up to 30. */
const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/

/**
 * All optional and nullable: absent means "leave alone", `null` erases. The site hides
 * whatever is empty.
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

export type AdministratorSiteUpdatePayload = z.infer<
  typeof AdministratorSiteUpdateValidator
>
