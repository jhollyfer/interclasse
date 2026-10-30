import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import RepresentativeEnrollmentShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class RepresentativeEnrollmentShowController {
  static docs = defineDocs({
    description:
      'A matriz aluno x modalidade da turma do representante. A turma sai da sessão: ' +
      'representante sem turma vinculada responde `404`.',
  })

  constructor(private readonly useCase: RepresentativeEnrollmentShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute({ actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
