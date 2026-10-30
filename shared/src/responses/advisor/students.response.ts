import { z } from '../../validator.js'

/** O aluno de uma turma, no cadastro, na edição e em cada item da lista. */
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
