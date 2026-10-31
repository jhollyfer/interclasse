import { z } from '../../validator.js'

/** A classroom student, in create, update and each list item. */
export const AdvisorStudentShowResponse = z.object({
  id: z.uuid(),
  classroomId: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
})

export type AdvisorStudentShowResponse = z.infer<
  typeof AdvisorStudentShowResponse
>
