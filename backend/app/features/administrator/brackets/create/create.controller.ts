import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { BracketCreateValidator } from '#features/administrator/brackets/brackets.validator'

@inject()
export default class AdministratorBracketCreateController {
  static docs = defineDocs({
    summary: 'Sortear chave',
    description:
      'O sorteio da modalidade numa categoria. Entram as turmas da categoria com ao menos ' +
      '`minAthletes` inscritos; elas são embaralhadas e a chave de mata-mata é montada ' +
      'inteira, da primeira fase à final.\n\n' +
      'Quando o número de turmas não fecha uma potência de dois (4, 8, 16), as que sobram ' +
      'ficam de folga e entram direto na fase seguinte. Até 16 turmas por chave.\n\n' +
      'Depois do sorteio as inscrições da modalidade naquela categoria travam. Para refazer, ' +
      'apague a chave.',
    // A mensagem deste código é montada com o mínimo da modalidade, e a leitura
    // de AST do gerador só colhe mensagem literal.
    errors: { 409: ['NOT_ENOUGH_TEAMS', 'TOO_MANY_TEAMS'] },
  })

  constructor(private readonly useCase: AdministratorBracketCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(BracketCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
