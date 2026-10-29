import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import type { UserError } from '#domain/user/user.errors'

/**
 * Cada recusa da conta como resposta HTTP, a mesma no painel de contas e na
 * edição da própria conta (`_standards/domain.md` §2). `switch` sobre o `code`
 * declarado, e o `never` do fim faz o compilador apontar fato novo sem tradução.
 */
export class UserRefusal {
  static http(error: UserError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'USER_ALREADY_EXISTS':
        return UserRefusal.alreadyExists(i18n)
      case 'USER_ALREADY_ARCHIVED':
        return HTTPException.Conflict(i18n.t('users.already_archived'), 'USER_ALREADY_ARCHIVED')
      case 'USER_NOT_ARCHIVED':
        return HTTPException.Conflict(i18n.t('users.not_archived'), 'USER_NOT_ARCHIVED', {
          id: i18n.t('users.not_archived_field'),
        })
      case 'CURRENT_PASSWORD_INVALID':
        return HTTPException.UnprocessableEntity(
          i18n.t('users.current_password_invalid'),
          'CURRENT_PASSWORD_INVALID',
          { currentPassword: i18n.t('users.current_password_invalid') },
        )
      case 'PASSWORD_SAME_AS_CURRENT':
        return HTTPException.UnprocessableEntity(
          i18n.t('users.password_same_as_current'),
          'PASSWORD_SAME_AS_CURRENT',
          { password: i18n.t('users.password_same_as_current') },
        )
      default:
        return UserRefusal.unreachable(error)
    }
  }

  /** O e-mail já é de outra conta: a checagem antes de gravar e a corrida no `unique`. */
  static alreadyExists(i18n: I18n): HTTPException {
    return HTTPException.Conflict(i18n.t('users.already_exists'), 'USER_ALREADY_EXISTS', {
      email: i18n.t('users.email_taken'),
    })
  }

  private static unreachable(error: never): never {
    throw new Error(`Recusa de conta sem tradução: ${JSON.stringify(error)}`)
  }
}
