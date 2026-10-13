import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import DocumentationReferenceShowUseCase from './show.use-case.ts'

/**
 * `GET /documentation`: a referência navegável. Fica em `openapi.ignore` e
 * atrás de `middleware.documentation()`, como o documento que ela lê.
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
