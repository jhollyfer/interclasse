import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorPhotoDeleteUseCase from './delete.use-case.ts'

import Photo from '#models/photo'
import PhotoPolicy from '#policies/photo.policy'
import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdvisorPhotoDeleteController {
  static docs = defineDocs({
    description:
      'Apaga uma foto que quem está logado enviou, aprovada ou não. Foto de outro ' +
      'conselheiro responde `404`.',
  })

  constructor(private readonly useCase: AdvisorPhotoDeleteUseCase) {}

  async handle(context: HttpContext) {
    const { id } = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const photo = await Photo.find(id)
    await context.bouncer.with(PhotoPolicy).authorize('manage', photo)
    if (!photo) return context.response.notFound()
    const result = await this.useCase.execute(photo)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
