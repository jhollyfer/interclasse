import { UPLOAD_STATUSES } from '../../enums/upload-status.js'
import { z } from '../../validator.js'

const date = () => z.iso.datetime({ offset: true })

/**
 * The regulation as a registered file, with the path in the bucket: the panel sees the
 * whole record. The `url` is signed on read and absent from a just-written record,
 * hence optional.
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
 * The site configuration as the API returns it in the panel: on read and on update
 * (`_standards/architecture.md` §10). `regulation` is null while there is no PDF.
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
