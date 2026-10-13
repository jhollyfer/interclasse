import { UserSchema } from '#database/schema'
import Storage from '#models/storage'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import type { ActiveStatus, UserRole } from '#core/entity'

/**
 * O mixin faz duas coisas que precisam andar juntas: gera o hash da senha antes
 * de gravar e expõe `verifyCredentials`, que busca pelo uid e confere o hash em
 * tempo constante. Separá-las é como nasce o caminho de criação que grava senha
 * em texto puro.
 */
const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(UserSchema, AuthFinder) {
  /**
   * Só o que não foi arquivado.
   *
   * O filtro é de segurança, e por isso mora num ponto só: escrito à mão em cada
   * consulta, ele depende de alguém lembrar, e a consulta que esquecer devolve
   * registro arquivado sem avisar. Consulta que precisa ver o arquivado pede
   * `trashed` de propósito, e a que não pede não tem como esquecer.
   */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })

  /** O espelho de `notDeleted`: só o que está na lixeira (`unarchive`, `?trashed=only`). */
  static onlyDeleted = scope((query) => {
    query.whereNotNull('deletedAt')
  })

  static accessTokens = DbAccessTokensProvider.forModel(User)

  /**
   * O token que autenticou **esta** requisição, preenchido pelo guard de
   * cookie. Fora do ciclo de uma requisição não existe, e por isso é opcional.
   */
  declare currentAccessToken?: AccessToken

  /**
   * Redeclarados só para estreitar o tipo: `database/schema.ts` é gerado das
   * colunas e entrega todo enum como `string`. Sem isto, comparar `role` com um
   * literal errado compilaria e só apareceria quando o Postgres recusasse a
   * escrita.
   */
  declare role: UserRole
  declare status: ActiveStatus

  /**
   * Avatar, no máximo um. Relação declarada à mão: `database/schema.ts` é
   * gerado a partir das colunas e não conhece relacionamento nenhum.
   *
   * Quem anexa é que guarda a referência - é o que permite uma tabela de
   * arquivos só, sem coluna de "tipo de dono".
   */
  @belongsTo(() => Storage, { foreignKey: 'avatarId' })
  declare avatar: BelongsTo<typeof Storage>
}
