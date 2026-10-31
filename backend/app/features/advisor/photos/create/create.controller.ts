import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorPhotoCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdvisorPhotoCreateValidator } from '#validators/advisor/photos.validator'

@inject()
export default class AdvisorPhotoCreateController {
  static docs = defineDocs({
    summary: 'Submit photo',
    description:
      'A photo for the site carousel. `storageId` is an image already uploaded through ' +
      '`/storages`. Born `PENDING`: it only appears on the site after the organization approves.',
  })

  constructor(private readonly useCase: AdvisorPhotoCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdvisorPhotoCreateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
