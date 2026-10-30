import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { UserError } from '#domain/user/user.errors'

/**
 * Cada recusa da conta como resposta HTTP, a mesma no painel de contas e na
 * edição da própria conta (`_standards/domain.md` §2). Tabela por `code`: fato
 * novo sem entrada não compila. O 409 do e-mail repetido é o da checagem antes
 * de gravar e o da corrida no `unique`, que o repository devolve como fato.
 */
export class UserRefusal extends RefusalBase {
  private static readonly TABLE = {
    USER_ALREADY_EXISTS: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('users.already_exists'), 'USER_ALREADY_EXISTS', {
        email: i18n.t('users.email_taken'),
      }),
    USER_ALREADY_ARCHIVED: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('users.already_archived'), 'USER_ALREADY_ARCHIVED'),
    USER_NOT_ARCHIVED: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('users.not_archived'), 'USER_NOT_ARCHIVED', {
        id: i18n.t('users.not_archived_field'),
      }),
    CURRENT_PASSWORD_INVALID: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('users.current_password_invalid'),
        'CURRENT_PASSWORD_INVALID',
        { currentPassword: i18n.t('users.current_password_invalid') },
      ),
    PASSWORD_SAME_AS_CURRENT: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('users.password_same_as_current'),
        'PASSWORD_SAME_AS_CURRENT',
        { password: i18n.t('users.password_same_as_current') },
      ),
  } satisfies RefusalTable<UserError>

  static http(error: UserError, i18n: I18n): HTTPException {
    return UserRefusal.translate(UserRefusal.TABLE, error.code, error, i18n)
  }
}
