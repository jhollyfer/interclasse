import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorReportShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class AdministratorReportShowController {
  static docs = defineDocs({
    summary: 'Relatório dos jogos',
    description:
      'Quantas turmas, alunos e atletas participaram: no total, por categoria, por ' +
      'modalidade e por turma, além das partidas jogadas e marcadas. Atleta é aluno ' +
      'inscrito em ao menos uma modalidade.',
  })

  constructor(private readonly useCase: AdministratorReportShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
