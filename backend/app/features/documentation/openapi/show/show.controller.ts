import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import DocumentationOpenapiShowUseCase from './show.use-case.ts'

/**
 * `GET /openapi.json`: the API document. Lives in `openapi.ignore` - the
 * document does not document itself - and behind `middleware.documentation()`.
 */
@inject()
export default class DocumentationOpenapiShowController {
  constructor(private readonly useCase: DocumentationOpenapiShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response.header('content-type', 'application/json').send(result.value)
  }
}
