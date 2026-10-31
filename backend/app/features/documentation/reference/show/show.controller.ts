import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import DocumentationReferenceShowUseCase from './show.use-case.ts'

/**
 * `GET /documentation`: the browsable reference. Lives in `openapi.ignore` and
 * behind `middleware.documentation()`, like the document it reads.
 */
@inject()
export default class DocumentationReferenceShowController {
  constructor(private readonly useCase: DocumentationReferenceShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response.header('content-type', 'text/html').send(result.value)
  }
}
