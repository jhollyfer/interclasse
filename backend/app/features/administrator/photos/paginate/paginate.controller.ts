import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPhotoPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PhotoPaginateValidator } from '#validators/administrator/photos.validator'

@inject()
export default class AdministratorPhotoPaginateController {
  static docs = defineDocs({
    description:
      'As fotos enviadas, da mais nova à mais antiga, com quem enviou. `?status=PENDING` ' +
      'é a fila do que espera revisão.',
  })

  constructor(private readonly useCase: AdministratorPhotoPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(PhotoPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
