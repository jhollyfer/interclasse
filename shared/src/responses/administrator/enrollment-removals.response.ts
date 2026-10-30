import {
  AdministratorClassroomPersonResponse,
  AdministratorClassroomShowResponse,
} from './classrooms.response.js'
import { AdministratorSportShowResponse } from './sports.response.js'
import { z } from '../../validator.js'

const datetime = () => z.iso.datetime({ offset: true })

/**
 * O aviso de atleta tirado da lista: a turma, a modalidade e quem tirou.
 * `acknowledgedAt` nulo é aviso pendente.
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
