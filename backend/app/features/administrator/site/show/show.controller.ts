import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSiteShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class AdministratorSiteShowController {
  static docs = defineDocs({
    summary: 'Site configuration',
    description:
      'The "About" text, the edition, the year of the first edition, who organizes, the ' +
      'Instagrams and the regulation PDF. An empty field is what the site does not show.',
  })

  constructor(private readonly useCase: AdministratorSiteShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
