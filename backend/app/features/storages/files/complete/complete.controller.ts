import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StoragesFileCompleteUseCase from './complete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { StoragesFileCompleteValidator } from '#validators/storages/files.validator'

@inject()
export default class StoragesFileCompleteController {
  static docs = defineDocs({
    summary: 'Confirm file upload',
    description:
      'Closes the upload opened by `POST /storages`: the bucket reassembles the parts and the row becomes ' +
      '`UPLOADED`, the only state that can be attached to anything.\n\n' +
      'The body carries the `ETag` each part `PUT` returned - that is how the storage verifies ' +
      'that no part was lost or arrived half-written. A single-part upload has no part ' +
      'to confirm, and `parts` is absent.\n\n' +
      'This is where the size **declared** in `POST /storages` is compared with that of the object that ' +
      'actually arrived. If it diverges, the object is deleted, the row dies with it and the response is `422`. ' +
      'The `mimetype` is not checked because it cannot diverge: it goes into the signature of the ' +
      'URL, and the bucket refuses a `PUT` that does not match it.\n\n' +
      'Calling twice is safe: the second returns the same record.',
  })

  constructor(private readonly useCase: StoragesFileCompleteUseCase) {}

  async handle(context: HttpContext) {
    const { id } = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(StoragesFileCompleteValidator)
    const result = await this.useCase.execute({ ...payload, id })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
