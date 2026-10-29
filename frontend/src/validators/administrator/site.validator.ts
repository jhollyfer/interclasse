import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

/** `@usuario` do Instagram: letras, números, ponto e sublinhado, até 30. */
const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/

/** Espelho de `backend/app/features/administrator/site/site.validator.ts`. */
export const SiteUpdateValidator = vine.create({
  about: vine.string().trim().maxLength(4000).nullable().optional(),
  organizer: vine.string().trim().maxLength(160).nullable().optional(),
  firstEditionYear: vine
    .number()
    .withoutDecimals()
    .min(1990)
    .max(2100)
    .nullable()
    .optional(),
  edition: vine.number().withoutDecimals().min(1).max(99).nullable().optional(),
  schoolInstagram: vine.string().trim().regex(INSTAGRAM).nullable().optional(),
  developerInstagram: vine
    .string()
    .trim()
    .regex(INSTAGRAM)
    .nullable()
    .optional(),
  regulationId: vine.string().uuid().nullable().optional(),
})

export type SiteUpdatePayload = Infer<typeof SiteUpdateValidator>
