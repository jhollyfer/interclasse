import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { STORAGE_MIMETYPES, STORAGE_SORT_COLUMNS } from '@interclasse/shared'

import StoragesFilePaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StoragesFilePaginateValidator } from '#validators/storages/files.validator'

@inject()
export default class StoragesFilePaginateController {
  static docs = defineDocs({
    summary: 'Listar arquivos',
    description:
      'The panel file library. `?search` filters by original name, generated name and ' +
      'type, `?status` separates what has already been uploaded from the open upload, and `?mimetype` narrows to one ' +
      'type only.\n\n' +
      // Both lists come from the tuples themselves: written by hand, the documentation
      // would start promising a value the day someone removed it from the validator.
      `\`?mimetype\` accepts ${STORAGE_MIMETYPES.join(', ')}.\n\n` +
      `\`?sort\` accepts ${STORAGE_SORT_COLUMNS.join(', ')} and \`?direction\` accepts asc or desc. ` +
      'Default: page 1, 20 per page, from most recent to oldest - in a file library ' +
      'what matters is what has just been uploaded.',
  })

  constructor(private readonly useCase: StoragesFilePaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(StoragesFilePaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
