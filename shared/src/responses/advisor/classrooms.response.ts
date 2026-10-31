import type { z } from '../../validator.js'
import { AdministratorClassroomShowResponse } from '../administrator/classrooms.response.js'

/** The advisor's classroom: the same shape as the panel. */
export const AdvisorClassroomShowResponse = AdministratorClassroomShowResponse

export type AdvisorClassroomShowResponse = z.infer<
  typeof AdvisorClassroomShowResponse
>
