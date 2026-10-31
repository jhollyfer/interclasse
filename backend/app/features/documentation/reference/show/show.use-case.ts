import { inject } from '@adonisjs/core'
import { right, type Either } from '@interclasse/shared'

import { scalarPage } from '#core/openapi/scalar'
import type HTTPException from '#exceptions/http.exception'
import openapi from '#config/openapi'

type Response = Either<HTTPException, string>

/** The browsable reference (Scalar) over `/openapi.json`. Building the page does no I/O. */
@inject()
export default class DocumentationReferenceShowUseCase {
  async execute(): Promise<Response> {
    return right(scalarPage('/openapi.json', openapi.info.title))
  }
}
