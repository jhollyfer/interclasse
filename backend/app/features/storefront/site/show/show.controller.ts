import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontSiteShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class StorefrontSiteShowController {
  static docs = defineDocs({
    summary: 'About the games',
    description:
      'The "About" of the games and the regulation to download. `regulation` is null while ' +
      'the organization has not uploaded the PDF; the `url` is signed and expires in minutes.',
  })

  constructor(private readonly useCase: StorefrontSiteShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
