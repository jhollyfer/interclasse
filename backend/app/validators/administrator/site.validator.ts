import { vine } from '#core/validator'
import type { Infer } from '#core/validator'

/** Instagram `@handle`: letters, digits, dot and underscore, up to 30. */
const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/

/**
 * All optional and nullable: absent means "leave alone", `null` erases. The site hides
 * whatever is empty.
 */
export const AdministratorSiteUpdateValidator = vine.create({
  about: vine.string().trim().maxLength(4000).nullable().optional(),
  organizer: vine.string().trim().maxLength(160).nullable().optional(),
  firstEditionYear: vine.number().withoutDecimals().min(1990).max(2100).nullable().optional(),
  edition: vine.number().withoutDecimals().min(1).max(99).nullable().optional(),
  schoolInstagram: vine.string().trim().regex(INSTAGRAM).nullable().optional(),
  developerInstagram: vine.string().trim().regex(INSTAGRAM).nullable().optional(),
  regulationId: vine.string().uuid().nullable().optional(),
})

export type AdministratorSiteUpdatePayload = Infer<typeof AdministratorSiteUpdateValidator>
