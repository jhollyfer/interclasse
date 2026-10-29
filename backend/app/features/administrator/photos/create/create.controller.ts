import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPhotoCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PhotoCreateValidator } from '#features/administrator/photos/photos.validator'

@inject()
export default class AdministratorPhotoCreateController {
  static docs = defineDocs({
    summary: 'Publicar foto',
    description:
      'Uma foto para o carrossel do site, já aprovada. `storageId` é uma imagem já ' +
      'enviada por `/storages`.',
  })

  constructor(private readonly useCase: AdministratorPhotoCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(PhotoCreateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
