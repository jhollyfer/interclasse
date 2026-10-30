import { PHOTO_STATUSES } from '../../enums/photo-status.js'
import { UPLOAD_STATUSES } from '../../enums/upload-status.js'
import { USER_ROLES } from '../../enums/user-role.js'
import { z } from '../../validator.js'

/**
 * A foto do carrossel como a API devolve: com o arquivo e quem enviou
 * (`_standards/architecture.md` §10). Datas em ISO 8601, o tipo de transporte.
 */
const datetime = () => z.iso.datetime({ offset: true })

export const AdministratorPhotoShowResponse = z.object({
  id: z.uuid(),
  storageId: z.uuid(),
  caption: z.string().nullable(),
  status: z.enum(PHOTO_STATUSES),
  authorId: z.uuid().nullable(),
  reviewedById: z.uuid().nullable(),
  reviewedAt: datetime().nullable(),
  storage: z.object({
    id: z.uuid(),
    filename: z.string(),
    originalName: z.string(),
    mimetype: z.string(),
    size: z.number(),
    path: z.string(),
    status: z.enum(UPLOAD_STATUSES),
    /** Assinada e de vida curta: sai pronta em toda leitura. */
    url: z.string(),
    createdAt: datetime().nullable(),
    updatedAt: datetime().nullable(),
    deletedAt: datetime().nullable(),
  }),
  /** Nulo quando a conta de quem enviou foi apagada. */
  author: z
    .object({
      id: z.uuid(),
      name: z.string(),
      email: z.string(),
      role: z.enum(USER_ROLES),
    })
    .nullable(),
  createdAt: datetime(),
  updatedAt: datetime().nullable(),
})

export type AdministratorPhotoShowResponse = z.infer<
  typeof AdministratorPhotoShowResponse
>
