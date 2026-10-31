import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StoragesFileDownloadUseCase from './download.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import StoragePolicy from '#policies/storage.policy'
import { StorageRepository } from '#repositories/storage/storage.repository'

@inject()
export default class StoragesFileDownloadController {
  static docs = defineDocs({
    summary: 'Download file with the original name',
    description:
      'Redirects to a temporary bucket URL that delivers the file with ' +
      '`Content-Disposition: attachment` and the original name.\n\n' +
      'It exists because of a browser limitation, not a storage one: the `download` attribute of an ' +
      '`<a>` is ignored across origins, and the API answers on an origin different from the app. Without ' +
      'this route, "save file" would open the image in a tab, and the file would arrive named ' +
      'with the uuid instead of the name the person uploaded.\n\n' +
      'It redirects instead of serving the binary: the header travels signed inside the URL, so the ' +
      'application hands out an address and gets out of the way, instead of being busy for the duration of ' +
      'each download transfer.\n\n' +
      '**Requires a session**: the bucket is `visibility: private`, and while this route was open ' +
      'it issued a signed URL for any uuid without a session - the back door the ' +
      'closing of the bucket left open. A file the person cannot reach responds `404` and ' +
      'not `403`, so as not to confirm to a prober that the uuid exists.',
    responses: { 302: 'no-content' },
  })

  constructor(
    private readonly useCase: StoragesFileDownloadUseCase,
    private readonly storages: StorageRepository,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const storage = await this.storages.findById(payload.id)
    await context.bouncer.with(StoragePolicy).authorize('download', storage)
    const result = await this.useCase.execute(payload)

    if (result.isLeft()) throw result.value

    return context.response.redirect(result.value)
  }
}
