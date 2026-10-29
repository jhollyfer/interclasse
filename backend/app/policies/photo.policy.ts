import { BasePolicy, AuthorizationResponse } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

import type Photo from '#models/photo'
import type User from '#models/user'
import { USER_ROLE } from '#core/entity'

/**
 * Quem mexe em qual foto: o administrador em todas, o conselheiro nas que ele
 * enviou. A negação é `404`, como na `ClassroomPolicy`: dizer "proibido"
 * confirmaria que a foto de outro conselheiro existe.
 */
export default class PhotoPolicy extends BasePolicy {
  manage(actor: User, photo: Photo | null): AuthorizerResponse {
    if (photo && actor.role === USER_ROLE.ADMINISTRATOR) return true
    if (photo && photo.authorId === actor.id) return true

    return AuthorizationResponse.deny('Foto não encontrada', 404).t('PHOTO_NOT_FOUND')
  }
}
