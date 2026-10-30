import { CATEGORIES } from '../../enums/category.js'
import { z } from '../../validator.js'

const count = () => z.number().int()

/**
 * O relatório dos jogos: totais, por categoria, por modalidade e por turma. Atleta
 * é aluno inscrito em ao menos uma modalidade (`_standards/architecture.md` §10).
 */
export const AdministratorReportShowResponse = z.object({
  totals: z.object({
    classrooms: count(),
    students: count(),
    athletes: count(),
    enrollments: count(),
    sports: count(),
    matchesPlayed: count(),
    matchesScheduled: count(),
  }),
  byCategory: z.array(
    z.object({
      category: z.enum(CATEGORIES),
      classrooms: count(),
      students: count(),
      athletes: count(),
    }),
  ),
  bySport: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      athletes: count(),
      classrooms: count(),
    }),
  ),
  classrooms: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      category: z.enum(CATEGORIES),
      advisor: z.string().nullable(),
      representative: z.string().nullable(),
      students: count(),
      athletes: count(),
      sports: count(),
    }),
  ),
})

export type AdministratorReportShowResponse = z.infer<
  typeof AdministratorReportShowResponse
>
