import { ACTIVE_STATUSES } from '../../enums/active-status.js'
import { USER_ROLES } from '../../enums/user-role.js'
import { z } from '../../validator.js'
import { StoragesFileShowResponse } from '../storages/files.response.js'

const date = () => z.iso.datetime({ offset: true })

/**
 * A conta como a API devolve: com o avatar, e nunca a senha. Vale no detalhe,
 * no cadastro, na edição e em cada item da lista.
 */
export const AdministratorUserShowResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(USER_ROLES),
  status: z.enum(ACTIVE_STATUSES),
  avatarId: z.uuid().nullable(),
  avatar: StoragesFileShowResponse.nullable(),
  createdAt: date(),
  updatedAt: date().nullable(),
  deletedAt: date().nullable(),
})

export type AdministratorUserShowResponse = z.infer<typeof AdministratorUserShowResponse>
