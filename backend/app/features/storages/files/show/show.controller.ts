import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StoragesFileShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class StoragesFileShowController {
  static docs = defineDocs({
    summary: 'View a file',
    description:
      'Returns the bare record, without envelope: the original label, the type, the size, the state of the ' +
      'upload and the derived `url`.\n\n' +
      'Also valid for a file still `PENDING` - the detail screen is where one discovers that ' +
      'an upload was left half-done. Whoever attaches is the one who requires `UPLOADED`.',
  })

  constructor(private readonly useCase: StoragesFileShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
