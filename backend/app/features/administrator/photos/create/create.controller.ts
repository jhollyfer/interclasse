import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPhotoCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorPhotoCreateValidator } from '#validators/administrator/photos.validator'

@inject()
export default class AdministratorPhotoCreateController {
  static docs = defineDocs({
    summary: 'Publish photo',
    description:
      'A photo for the site carousel, already approved. `storageId` is an image already ' +
      'uploaded through `/storages`.',
  })

  constructor(private readonly useCase: AdministratorPhotoCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorPhotoCreateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
