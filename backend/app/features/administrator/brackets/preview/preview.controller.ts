import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketPreviewUseCase from './preview.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { DrawPreviewResponse } from '#core/openapi/response'
import { BracketPreviewValidator } from '#features/administrator/brackets/brackets.validator'

@inject()
export default class AdministratorBracketPreviewController {
  static docs = defineDocs({
    summary: 'Prever sorteio de chave',
    description:
      'Quem entraria no sorteio agora: cada turma da categoria com quantos atletas inscreveu ' +
      'na modalidade, e se chegou ao mínimo. Não grava nada.',
    responses: { 200: DrawPreviewResponse },
  })

  constructor(private readonly useCase: AdministratorBracketPreviewUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(BracketPreviewValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
