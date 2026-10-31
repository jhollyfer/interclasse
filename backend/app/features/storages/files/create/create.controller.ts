import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { STORAGE_MIMETYPES, StoragesFileUploadResponse } from '@interclasse/shared'

import StoragesFileCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StoragesFileCreateValidator, UPLOAD_MAX_SIZE } from '#validators/storages/files.validator'
import { PART_SIZE } from '#services/multipart/multipart.contract'

@inject()
export default class StoragesFileCreateController {
  static docs = defineDocs({
    summary: 'Open file upload',
    // The response is not the file, it is the upload plan - hence declared here
    // instead of coming from the feature's default `Storage` resource.
    responses: { 201: StoragesFileUploadResponse },
    description:
      'Opens an upload and returns where to upload it. **Does not receive bytes** - only the metadata of the ' +
      'file.\n\n' +
      'The binary goes from the browser straight to the bucket, by signed URL, and never crosses this ' +
      'application: a large file in an HTTP body hits the proxy limit, occupies the ' +
      'application for the duration of the upload, and cannot be resumed when the connection drops.\n\n' +
      `Accepts ${STORAGE_MIMETYPES.join(', ')}, up to ${UPLOAD_MAX_SIZE} bytes, refused **before** ` +
      'any signature: a forbidden file gets no URL, so it never reaches the bucket. That the declared ' +
      'size is true is what `POST /storages/:id/complete` checks, against the ' +
      'real object.\n\n' +
      `The file is sliced into parts of ${PART_SIZE} bytes. When it fits in a single part, ` +
      '`uploadId` is null and the only URL accepts a `PUT` with the whole file. When it does not ' +
      'fit, each URL accepts its part, the client keeps the `ETag` each `PUT` returns, and ' +
      '`parts` may carry only the first batch - the rest comes from `GET /storages/:id/parts`, which ' +
      'is the same endpoint as the resume.\n\n' +
      'The row is born `PENDING` and cannot be attached to anything until it is confirmed. The file ' +
      'is born without an owner: whoever attaches keeps the reference, informing the `id` in the ' +
      'resource field (today, the user `avatarId`).',
  })

  constructor(private readonly useCase: StoragesFileCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(StoragesFileCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
