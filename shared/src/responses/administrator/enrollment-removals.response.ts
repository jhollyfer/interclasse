import {
  AdministratorClassroomPersonResponse,
  AdministratorClassroomShowResponse,
} from './classrooms.response.js'
import { AdministratorSportShowResponse } from './sports.response.js'
import { z } from '../../validator.js'

const datetime = () => z.iso.datetime({ offset: true })

/**
 * The notice of an athlete removed from the list: the classroom, the sport and who
 * removed them. A null `acknowledgedAt` means a pending notice.
 */
export const AdministratorEnrollmentRemovalShowResponse = z.object({
  id: z.uuid(),
  classroomId: z.uuid(),
  sportId: z.uuid(),
  studentId: z.uuid().nullable(),
  studentName: z.string(),
  reason: z.string(),
  actorId: z.uuid().nullable(),
  acknowledgedAt: datetime().nullable(),
  createdAt: datetime(),
  updatedAt: datetime().nullable(),
  classroom: AdministratorClassroomShowResponse.omit({
    advisor: true,
    representative: true,
  }),
  sport: AdministratorSportShowResponse,
  actor: AdministratorClassroomPersonResponse.nullable(),
})

export type AdministratorEnrollmentRemovalShowResponse = z.infer<
  typeof AdministratorEnrollmentRemovalShowResponse
>
