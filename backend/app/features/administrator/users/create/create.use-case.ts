import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorUserShowResponse, type Either } from '@interclasse/shared'

import { User } from '#domain/user/user.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { UserRepository } from '#repositories/user/user.repository'
import { FileRefusal } from '#features/storages/files/_shared.file-refusal'
import { UserRefusal } from '#features/administrator/users/_shared.user-refusal'
import type { AdministratorUserCreatePayload } from '#validators/administrator/users.validator'

type Payload = AdministratorUserCreatePayload
type Response = Either<HTTPException, AdministratorUserShowResponse>

/**
 * Cria a conta. Único caminho de criação de usuário na API - não há cadastro
 * público -, e por isso o papel vem sempre explícito no payload.
 *
 * A senha entra em texto puro e sai cifrada: quem cifra é a persistência (hook
 * do model). Passar o hash daqui geraria um hash de hash e nenhum login
 * funcionaria.
 */
@inject()
export default class AdministratorUserCreateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storages: StorageRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // A foto é conferida **antes** de qualquer escrita: `avatar_id` é chave
      // estrangeira, e sem isto um uuid inexistente estouraria a constraint e
      // viraria `500` em vez de `422` apontando o campo.
      if (payload.avatarId && !(await this.storages.areAttachable([payload.avatarId])))
        return left(FileRefusal.attachmentNotFound('avatarId', this.i18n))

      // Busca **sem** filtrar arquivados: o `unique` de `email` vale para a
      // tabela inteira, então conta arquivada continua ocupando o e-mail e é
      // reativada com os dados novos, em vez de inserir de novo e esbarrar no
      // índice. Reativar preserva `id` e `created_at`, e dispensa uma guarda de
      // colisão no `unarchive`.
      const existing = await this.users.findByEmail(payload.email)
      const now = new Date()
      let user = User.create({ id: randomUUID(), ...payload, now })

      if (existing) {
        const revived = existing.revive(payload, now)
        if (revived.isLeft()) return left(UserRefusal.http(revived.value, this.i18n))

        user = revived.value
      }

      const saved = await this.users.save(user)
      if (saved.isLeft()) return left(UserRefusal.http(saved.value, this.i18n))

      // Recarrega antes de responder: `status` vem de `DEFAULT` no banco quando
      // não foi informado, e a foto vem com a URL.
      const detail = await this.users.detail(user.id)
      if (!detail)
        return left(HTTPException.NotFound(this.i18n.t('users.not_found'), 'USER_NOT_FOUND'))

      return right(detail)
    } catch (error) {
      logger.error({ err: error }, '[administrator/users > create][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_USER_CREATE_ERROR',
        ),
      )
    }
  }
}
