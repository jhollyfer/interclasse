import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorPhotoDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdvisorPhotoDeleteController {
  static docs = defineDocs({
    description:
      'Deletes a photo that the logged user submitted, approved or not. A photo from another ' +
      'advisor responds `404`.',
  })

  constructor(private readonly useCase: AdvisorPhotoDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
