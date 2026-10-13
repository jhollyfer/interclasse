import { inject } from '@adonisjs/core'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'

import User from '#models/user'
import StorageService from '#services/storage/storage.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import type { Merge } from '#core/entity'
import type { ProfileUpdatePayload } from '#features/account/profile/profile.validator'

type Payload = Merge<ProfileUpdatePayload, { actor: User }>
type Response = Either<HTTPException, User>

@inject()
export default class AccountProfileUpdateUseCase {
  constructor(private readonly storage: StorageService) {}

  // `currentPassword` sai do payload aqui: ele é prova de identidade, não
  // coluna, e deixá-lo passar faria o `merge()` lá embaixo tentar gravá-lo.
  async execute({ actor: user, currentPassword, ...payload }: Payload): Promise<Response> {
    try {
      // A conta é o `actor` da sessão: o guard já a leu com os filtros de
      // arquivado e inativo, e reconsultar por id pagaria a mesma pergunta duas
      // vezes (_padroes/backend.md §4.3).

      if (payload.email && payload.email !== user.email) {
        // Sem filtrar arquivados: o `unique` do e-mail vale para a tabela
        // inteira, então sem esta checagem o save estouraria a constraint e
        // viraria 500.
        const exist = await User.query()
          .where('email', payload.email)
          .whereNot('id', user.id)
          .first()

        if (exist)
          return left(
            HTTPException.Conflict('Usuário já existe', 'USER_ALREADY_EXISTS', {
              email: 'Usuário já existe',
            }),
          )
      }

      // Antes do merge: `avatar_id` é chave estrangeira, e sem esta checagem um
      // uuid inexistente estouraria a constraint e viraria 500. `assertExist`
      // também recusa o que ainda está `PENDING` - o binário sobe direto para o
      // bucket, e anexar antes da confirmação publicaria uma foto pela metade.
      if (payload.avatarId) {
        const avatar = await this.storage.assertExist('avatarId', [payload.avatarId])

        if (avatar.isLeft()) return left(avatar.value)
      }

      // Antes de qualquer outra regra de senha: é a prova de identidade, e o
      // resto só faz sentido depois dela. O `middleware.auth()` prova posse do
      // cookie, e um cookie sequestrado trocaria a senha sem que o dono da
      // conta tivesse dito nada. `PASSWORD_SAME_AS_CURRENT` não cobre isso -
      // ele compara a nova com o hash, e passar por ele é justamente **não**
      // saber a atual.
      //
      // Que `currentPassword` exista quando `password` existe é o validator que
      // garante (`requiredIfExists`); a checagem de ausência aqui só estreita o tipo.
      if (
        payload.password &&
        (!currentPassword || !(await hash.verify(user.password, currentPassword)))
      )
        return left(
          HTTPException.UnprocessableEntity('Senha atual inválida', 'CURRENT_PASSWORD_INVALID', {
            currentPassword: 'Senha atual inválida',
          }),
        )

      if (payload.password && (await hash.verify(user.password, payload.password)))
        return left(
          HTTPException.UnprocessableEntity(
            'A nova senha deve ser diferente da atual',
            'PASSWORD_SAME_AS_CURRENT',
            { password: 'A nova senha deve ser diferente da atual' },
          ),
        )

      // Trocar e-mail ou senha derruba todas as sessões: sem isso um token
      // anterior à troca de acesso sobreviveria. Avaliado antes do merge,
      // enquanto `user.email` ainda é o valor atual.
      const shouldRevoke =
        Boolean(payload.email && payload.email !== user.email) || Boolean(payload.password)

      // `merge` só escreve as chaves presentes: campo ausente no payload não
      // vira `undefined` na linha. É o que faz o `PUT` ser parcial de verdade.
      user.merge(payload)
      await user.save()

      // O mixin `withAuthFinder` já re-hasheou a senha no save acima.
      if (shouldRevoke) await User.accessTokens.deleteAll(user)

      // Recarrega o avatar depois do save: quem acabou de trocar a foto tem de
      // receber a `url` nova na mesma resposta, sem uma leitura a mais.
      await user.load('avatar')

      return right(user)
    } catch (error) {
      logger.error({ err: error }, '[account > update][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'ACCOUNT_UPDATE_ERROR'),
      )
    }
  }
}
