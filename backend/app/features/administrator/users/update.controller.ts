import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorUserUpdateUseCase from './update.use-case.ts'
import { AdministratorUserUpdateValidator, IdentifierValidator } from '#core/validator'

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
    // Declarado à mão porque nasce fora deste par: quem levanta o
    // `STORAGE_NOT_FOUND` é o `StorageService`, e a leitura de AST do gerador
    // só enxerga o `HTTPException` escrito no use-case irmão.
    errors: { 422: 'STORAGE_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorUserUpdateUseCase) {}

  async handle(context: HttpContext) {
    // Corpo e params validados separadamente e fundidos: o `:id` vem da URL e
    // não do payload, e um schema só aceitaria um `id` no corpo capaz de
    // apontar para outra linha.
    const body = await AdministratorUserUpdateValidator.validate(context.request.body())
    const params = await IdentifierValidator.validate(context.request.params())
    // O ator vem da sessão, e não do payload.
    const result = await this.useCase.execute({
      ...body,
      ...params,
      actor: context.auth.user!,
    })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
