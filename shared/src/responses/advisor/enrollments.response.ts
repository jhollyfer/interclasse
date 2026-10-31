import { CATEGORIES } from '../../enums/category.js'
import { z } from '../../validator.js'

/**
 * The enrollments of a classroom: the sports, the students and which sports each one
 * is in. It is the student x sport matrix of the advisor and the representative.
 *
 * `drawn` says the sport was already drawn in the classroom's category; `locked`,
 * that its list no longer changes for whoever reads it (only the representative is locked).
 */
export const AdvisorEnrollmentShowResponse = z.object({
  classroom: z.object({
    id: z.uuid(),
    name: z.string(),
    category: z.enum(CATEGORIES),
  }),
  sports: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      minAthletes: z.number().int(),
      maxAthletes: z.number().int(),
      drawn: z.boolean(),
      locked: z.boolean(),
    }),
  ),
  students: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      sportIds: z.array(z.uuid()),
    }),
  ),
})

export type AdvisorEnrollmentShowResponse = z.infer<
  typeof AdvisorEnrollmentShowResponse
>
