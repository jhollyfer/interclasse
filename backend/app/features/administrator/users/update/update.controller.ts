import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorUserUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import UserPolicy from '#policies/user.policy'
import { UserUpdateValidator } from '#features/administrator/users/users.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserUpdateController {
  static docs = defineDocs({
    summary: 'Atualizar usuário',
    description:
      'Todo campo é opcional: só o que vier no payload muda. Campo ausente significa ' +
      '"não mexer", não "apagar" - a exceção é `avatarId`, onde `null` é como se tira a foto ' +
      'sem trocá-la.\n\n' +
      '`role` entra aqui, ao contrário de `PUT /account`: promover e rebaixar é o que este ' +
      'recurso existe para fazer.\n\n' +
      'Trocar e-mail ou senha **derruba todas as sessões** da conta alterada - sem isso, ' +
      'desligar o acesso de alguém não desligaria nada. A resposta nunca traz a senha.\n\n' +
      'Sobre a **própria** conta, `role` e `status` respondem `403`: rebaixar-se a conselheiro ou ' +
      'marcar-se `INACTIVE` tira do painel quem estava administrando. Nome, e-mail, senha e ' +
      'foto continuam editáveis.',
    // Declarados à mão porque nascem fora deste par: `STORAGE_NOT_FOUND` vem do
    // `StorageService` e `SELF_ACCESS_FORBIDDEN` da `UserPolicy`, e a leitura de
    // AST do gerador só enxerga o `HTTPException` escrito no use-case irmão.
    errors: { 403: 'SELF_ACCESS_FORBIDDEN', 422: 'STORAGE_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorUserUpdateUseCase) {}

  async handle(context: HttpContext) {
    // Corpo e params validados separadamente e fundidos: o `:id` vem da URL e
    // não do payload, e um schema só aceitaria um `id` no corpo capaz de
    // apontar para outra linha.
    const body = await UserUpdateValidator.validate(context.request.body())
    const params = await IdentifierValidator.validate(context.request.params())
    await context.bouncer.with(UserPolicy).authorize('update', params.id, body)
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
