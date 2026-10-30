import { z } from '../../validator.js'

/**
 * O aviso como a API devolve: no detalhe, no cadastro, na edição e em cada item
 * da lista (`_standards/architecture.md` §10). Datas em ISO 8601, o tipo de
 * transporte.
 */
export const AdministratorAnnouncementShowResponse = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  pinned: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
})

export type AdministratorAnnouncementShowResponse = z.infer<
  typeof AdministratorAnnouncementShowResponse
>
