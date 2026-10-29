import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPhotoReviewUseCase from './review.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PhotoReviewValidator } from '#validators/administrator/photos.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorPhotoReviewController {
  static docs = defineDocs({
    summary: 'Aprovar ou recusar foto',
    description:
      '`APPROVED` põe a foto no carrossel do site; `REJECTED` tira. A decisão pode ser ' +
      'refeita a qualquer momento.',
  })

  constructor(private readonly useCase: AdministratorPhotoReviewUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(PhotoReviewValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({
      ...body,
      ...params,
      actor: context.auth.getUserOrFail(),
    })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
