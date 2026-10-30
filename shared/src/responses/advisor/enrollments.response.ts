import { CATEGORIES } from '../../enums/category.js'
import { z } from '../../validator.js'

/**
 * As inscrições de uma turma: as modalidades, os alunos e em quais modalidades
 * cada um está. É a matriz aluno x modalidade do conselheiro e do representante.
 *
 * `drawn` diz que a modalidade já foi sorteada na categoria da turma; `locked`,
 * que a lista dela não muda mais para quem lê (só o representante trava).
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
