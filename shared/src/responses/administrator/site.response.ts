import { UPLOAD_STATUSES } from '../../enums/upload-status.js'
import { z } from '../../validator.js'

const date = () => z.iso.datetime({ offset: true })

/**
 * O regulamento como arquivo registrado, com o caminho no bucket: o painel vê
 * o registro inteiro. A `url` é assinada na leitura e some do registro recém
 * gravado, por isso é opcional.
 */
export const AdministratorSiteRegulationResponse = z.object({
  id: z.uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimetype: z.string(),
  size: z.number(),
  path: z.string(),
  status: z.enum(UPLOAD_STATUSES),
  partSize: z.number().nullable(),
  uploadId: z.string().nullable(),
  url: z.string().optional(),
  createdAt: date().nullable(),
  updatedAt: date().nullable(),
  deletedAt: date().nullable(),
})

/**
 * A configuração do site como a API devolve no painel: na leitura e na
 * edição (`_standards/architecture.md` §10). `regulation` é nulo enquanto não
 * houver PDF.
 */
export const AdministratorSiteShowResponse = z.object({
  id: z.uuid(),
  about: z.string().nullable(),
  organizer: z.string().nullable(),
  firstEditionYear: z.number().int().nullable(),
  edition: z.number().int().nullable(),
  schoolInstagram: z.string().nullable(),
  developerInstagram: z.string().nullable(),
  regulationId: z.uuid().nullable(),
  regulation: AdministratorSiteRegulationResponse.nullable(),
  createdAt: date(),
  updatedAt: date().nullable(),
})

export type AdministratorSiteRegulationResponse = z.infer<
  typeof AdministratorSiteRegulationResponse
>

export type AdministratorSiteShowResponse = z.infer<
  typeof AdministratorSiteShowResponse
>
