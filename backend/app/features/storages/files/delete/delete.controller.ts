import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StoragesFileDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class StoragesFileDeleteController {
  static docs = defineDocs({
    summary: 'Delete storage file',
    description:
      '**Irreversible**: deletes the binary in the bucket and the row in `storages`.\n\n' +
      'Only deletes an **orphan** file. The file is a neutral, shared record - it does not ' +
      'belong to the form that submitted it -, so whoever references it rules: a file ' +
      'in use by another record (today, a user avatar) responds `409`, with the origin in the ' +
      'message. Unlink first, delete after.\n\n' +
      'A file still `PENDING` is an upload cancellation: the multipart is aborted, and that is what ' +
      'makes the parts already sent disappear from the bucket.\n\n' +
      'It is the pair of `POST /storages`, which saves the file before the form is saved: without ' +
      'this route, every attachment chosen and then removed from the screen would stay in the bucket forever.',
  })

  constructor(private readonly useCase: StoragesFileDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
