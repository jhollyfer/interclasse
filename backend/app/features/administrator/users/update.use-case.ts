import User from '#models/user'
import UserPolicy from '#policies/user_policy'
import ClassroomService from '#services/classroom.service'
import StorageService from '#services/storage.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActiveStatuses, type Merge } from '#core/entity'
import type { AdministratorUserUpdatePayload, IdentifierPayload } from '#core/validator'

/** `actor` é quem faz a requisição, tirado da sessão pelo controller. */
type Payload = Merge<AdministratorUserUpdatePayload, Merge<IdentifierPayload, { actor: User }>>
type Response = Either<HTTPException, User>

/**
 * Edita a conta. Nome, e-mail, senha e foto valem para qualquer alvo; papel e
 * status, não: sobre a própria conta os dois são recusados.
 *
 * É a guarda de auto-trancamento, no mesmo molde do projeto de referência -
 * `403` antes de qualquer leitura, dizendo que é proibido em vez de esconder a
 * existência. Sem ela um administrador se rebaixa a conselheiro ou se marca
 * `INACTIVE` e perde o painel, e o único conserto é rodar o seeder.
 *
 * Nome e e-mail continuam editáveis sobre a própria conta: nenhum dos dois
 * tranca ninguém para fora.
 */
@inject()
export default class AdministratorUserUpdateUseCase {
  constructor(
    private readonly storage: StorageService,
    private readonly policy: UserPolicy,
    private readonly classrooms: ClassroomService
  ) {}

  async execute({ id, actor, ...payload }: Payload): Promise<Response> {
    try {
      // A presença do campo basta, sem comparar com o valor atual: mandar o
      // próprio papel de volta não é edição, e aceitar o que não muda nada só
      // daria duas respostas para a mesma regra.
      if (
        !this.policy.operate(actor, id) &&
        (payload.role !== undefined || payload.status !== undefined)
      )
        return left(
          HTTPException.Forbidden(
            'Você não pode alterar o próprio papel ou status',
            'SELF_ACCESS_FORBIDDEN'
          )
        )

      const user = await User.query()
        .where('id', id)
        .withScopes((scopes) => scopes.notDeleted())
        .first()

      if (!user) return left(HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'))

      if (payload.email && payload.email !== user.email) {
        // Sem filtrar arquivados: o `unique` do e-mail vale para a tabela
        // inteira, então sem esta checagem o save estouraria a constraint e
        // viraria `500`.
        const exist = await User.query().where('email', payload.email).whereNot('id', id).first()

        if (exist)
          return left(
            HTTPException.Conflict('Usuário já existe', 'USER_ALREADY_EXISTS', {
              email: 'Já existe um usuário com este e-mail',
            })
          )
      }

      if (payload.avatarId) {
        const avatar = await this.storage.assertExist('avatarId', [payload.avatarId])

        if (avatar.isLeft()) return left(avatar.value)
      }

      // Trocar e-mail ou senha derruba todas as sessões do alvo: sem isso um
      // token anterior à troca de acesso sobreviveria, e desligar o acesso de
      // alguém não desligaria nada. Avaliado antes do merge, enquanto
      // `user.email` ainda é o valor atual.
      //
      // Desativar a conta e trocar o papel também derrubam: o guard não lê
      // `status`, e um conselheiro desativado seguiria editando listas até o
      // token vencer.
      const roleChanged = Boolean(payload.role && payload.role !== user.role)
      const shouldRevoke =
        Boolean(payload.email && payload.email !== user.email) ||
        Boolean(payload.password) ||
        roleChanged ||
        payload.status === ActiveStatuses.INACTIVE

      // `merge` só escreve as chaves presentes: campo ausente no payload não
      // vira `undefined` na linha. É o que faz o `PUT` ser parcial de verdade
      //.
      user.merge(payload)
      await user.save()

      // O mixin `withAuthFinder` já re-hasheou a senha no save acima.
      if (shouldRevoke) await User.accessTokens.deleteAll(user)
      if (roleChanged) await this.classrooms.detach(user)

      // Recarrega antes de responder: quem acabou de editar recebe a linha como
      // ela ficou no banco, com `updated_at` e a foto nova, sem uma segunda
      // requisição.
      await user.refresh()
      await user.load('avatar')

      return right(user)
    } catch (error) {
      logger.error({ err: error }, '[users > update][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'USER_UPDATE_ERROR')
      )
    }
  }
}
