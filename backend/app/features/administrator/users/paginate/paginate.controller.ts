import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { USER_SORT_COLUMNS } from '@interclasse/shared'

import AdministratorUserPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorUserPaginateValidator } from '#validators/administrator/users.validator'

@inject()
export default class AdministratorUserPaginateController {
  static docs = defineDocs({
    summary: 'List users',
    description:
      'Paginated listing. `?role` and `?status` are the two cuts of the screen, `?search` filters ' +
      'by name and email, and `?trashed` reaches the archived ones.\n\n' +
      'The password does not come out here nor in any API response.\n\n' +
      // The list comes from the tuple itself: written by hand, the documentation would start
      // promising a column the day someone removed it from the validator.
      `\`?sort\` accepts ${USER_SORT_COLUMNS.join(', ')} and \`?direction\` accepts asc or desc. ` +
      'Default: page 1, 20 per page, ordered by name ascending.',
  })

  constructor(private readonly useCase: AdministratorUserPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorUserPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
