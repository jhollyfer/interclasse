import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPhotoReviewUseCase from './review.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorPhotoReviewValidator } from '#validators/administrator/photos.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorPhotoReviewController {
  static docs = defineDocs({
    summary: 'Approve or reject photo',
    description:
      '`APPROVED` puts the photo on the site carousel; `REJECTED` takes it off. The decision can be ' +
      'redone at any time.',
  })

  constructor(private readonly useCase: AdministratorPhotoReviewUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdministratorPhotoReviewValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({
      ...body,
      ...params,
      actor: context.actor,
    })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
