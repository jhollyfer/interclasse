import { AdministratorClassroomShowResponse } from '../administrator/classrooms.response.js'
import type { z } from '../../validator.js'

/** A turma do conselheiro: a mesma forma do painel. */
export const AdvisorClassroomShowResponse = AdministratorClassroomShowResponse

export type AdvisorClassroomShowResponse = z.infer<typeof AdvisorClassroomShowResponse>
