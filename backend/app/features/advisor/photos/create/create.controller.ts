import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorPhotoCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PhotoCreateValidator } from '#validators/advisor/photos.validator'

@inject()
export default class AdvisorPhotoCreateController {
  static docs = defineDocs({
    summary: 'Enviar foto',
    description:
      'Uma foto para o carrossel do site. `storageId` é uma imagem já enviada por ' +
      '`/storages`. Nasce `PENDING`: só aparece no site depois que a organização aprova.',
  })

  constructor(private readonly useCase: AdvisorPhotoCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(PhotoCreateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
