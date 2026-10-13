import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import AdministratorUserCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { UserCreateValidator } from '#features/administrator/users/users.validator'

@inject()
export default class AdministratorUserCreateController {
  static docs = defineDocs({
    summary: 'Criar usuário',
    description:
      'Devolve `201` com a conta criada, objeto nu, sem envelope e **sem a senha**.\n\n' +
      'Único caminho de criação de usuário na API: não há cadastro público, e o primeiro ' +
      'administrador vem do seeder.\n\n' +
      '`role` é obrigatório - o papel é sempre explícito no servidor. `password` exige ' +
      '`passwordConfirmation` com o mesmo valor.\n\n' +
      'E-mail de uma conta viva responde `409`. E-mail de uma conta **arquivada** reativa ' +
      'aquela linha com os dados novos: `email` é `UNIQUE` global, e inserir de novo ' +
      'esbarraria no índice.',
    // Declarado à mão porque nasce fora deste par: quem levanta o
    // `STORAGE_NOT_FOUND` é o `StorageService`, e a leitura de AST do gerador
    // só enxerga o `HTTPException` escrito no use-case irmão.
    errors: { 422: 'STORAGE_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorUserCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(UserCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
