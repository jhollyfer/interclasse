import { z } from '../../validator.js'

/**
 * The sport as the API returns it: in detail, create, update and each list item
 * (`_standards/architecture.md` §10). Dates in ISO 8601, the transport type.
 */
export const AdministratorSportShowResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  minAthletes: z.number().int(),
  maxAthletes: z.number().int(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
})

export type AdministratorSportShowResponse = z.infer<
  typeof AdministratorSportShowResponse
>
