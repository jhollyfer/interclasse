import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { StoragesFileUploadResponse } from '@interclasse/shared'

import StoragesFilePartsUseCase from './parts.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { PART_SIZE, PRESIGNED_BATCH } from '#services/multipart/multipart.contract'

@inject()
export default class StoragesFilePartsController {
  static docs = defineDocs({
    summary: 'Resume file upload',
    responses: { 200: StoragesFileUploadResponse },
    description:
      'Where to continue from: in `uploaded`, what the bucket has already received; in `parts`, a new URL for ' +
      'what is missing.\n\n' +
      'It serves two cases that are the same problem. **Resume**: the connection dropped midway, and ' +
      'without this the only way out would be to start over. **Next batch**: the URLs come out ' +
      // Both numbers come from the service constants: written by hand, the
      // documentation would start lying the day one of them changed.
      `${PRESIGNED_BATCH} at a time, because signing everything at once would be hundreds ` +
      `of kilobytes of JSON before the first byte goes up. Each part has ${PART_SIZE} bytes.` +
      '\n\n' +
      'Signing again is the point, not a side effect: a signed URL expires, and an upload ' +
      'that lasted longer than the validity finds here a new address for the same part.\n\n' +
      'An already confirmed file responds `200` with both lists empty - whoever asks is a ' +
      'resuming client, and reading the `status` and stopping is the right outcome.',
  })

  constructor(private readonly useCase: StoragesFilePartsUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
