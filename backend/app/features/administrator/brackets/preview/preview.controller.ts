import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketPreviewUseCase from './preview.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorBracketPreviewValidator } from '#validators/administrator/brackets.validator'

@inject()
export default class AdministratorBracketPreviewController {
  static docs = defineDocs({
    summary: 'Preview bracket draw',
    description:
      'Who would enter the draw now: each classroom of the category with how many athletes it enrolled ' +
      'in the sport, and whether it reached the minimum. Saves nothing.',
  })

  constructor(private readonly useCase: AdministratorBracketPreviewUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorBracketPreviewValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
