import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { type ActiveStatus, type UserRole } from '@interclasse/shared'

import Storage from '#models/storage'
import { UserSchema } from '#database/schema'

/**
 * The mixin does two things that must go together: it hashes the password before
 * saving and exposes `verifyCredentials`, which looks up by uid and checks the hash in
 * constant time. Separating them is how a creation path that saves a plain-text
 * password is born.
 */
const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(UserSchema, AuthFinder) {
  /**
   * Only what has not been archived.
   *
   * The filter is a security one, and so lives in a single place: written by hand in each
   * query, it depends on someone remembering, and the query that forgets returns
   * an archived record without warning. A query that needs to see the archived asks for
   * `trashed` on purpose, and the one that does not ask cannot forget.
   */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })

  /** The mirror of `notDeleted`: only what is in the trash (`unarchive`, `?trashed=only`). */
  static onlyDeleted = scope((query) => {
    query.whereNotNull('deletedAt')
  })

  static accessTokens = DbAccessTokensProvider.forModel(User)

  /**
   * The token that authenticated **this** request, filled in by the cookie
   * guard. Outside a request's lifecycle it does not exist, which is why it is optional.
   */
  declare currentAccessToken?: AccessToken

  /**
   * Redeclared only to narrow the type: `database/schema.ts` is generated from the
   * columns and delivers every enum as `string`. Without this, comparing `role` with a
   * wrong literal would compile and only show up when Postgres refused the
   * write.
   */
  declare role: UserRole
  declare status: ActiveStatus

  /**
   * Avatar, at most one. A hand-declared relation: `database/schema.ts` is
   * generated from the columns and knows no relationship at all.
   *
   * Whoever attaches keeps the reference - it is what allows a single files table,
   * with no "owner type" column.
   */
  @belongsTo(() => Storage, { foreignKey: 'avatarId' })
  declare avatar: BelongsTo<typeof Storage>
}
