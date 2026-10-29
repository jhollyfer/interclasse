import { z } from '../../validator.js'

/**
 * A modalidade como a API devolve: no detalhe, no cadastro, na edição e em cada
 * item da lista (`_standards/architecture.md` §10). Datas em ISO 8601, o tipo de
 * transporte.
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

export type AdministratorSportShowResponse = z.infer<typeof AdministratorSportShowResponse>
