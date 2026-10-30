import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontPhotoPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PageValidator } from '#core/validator'

@inject()
export default class StorefrontPhotoPaginateController {
  static docs = defineDocs({
    description:
      'As fotos aprovadas para o carrossel, da mais nova à mais antiga. A `url` é ' +
      'assinada e vence em minutos.',
  })

  constructor(private readonly useCase: StorefrontPhotoPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(PageValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
