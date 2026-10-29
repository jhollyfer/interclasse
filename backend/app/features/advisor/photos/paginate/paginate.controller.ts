import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorPhotoPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { PhotoPaginateValidator } from '#features/advisor/photos/photos.validator'

@inject()
export default class AdvisorPhotoPaginateController {
  static docs = defineDocs({
    description:
      'As fotos que quem está logado enviou, da mais nova à mais antiga, com o `status` ' +
      'da revisão: `PENDING` aguarda, `APPROVED` está no site, `REJECTED` foi recusada.',
  })

  constructor(private readonly useCase: AdvisorPhotoPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(PhotoPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
