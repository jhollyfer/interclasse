import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import AccountProfileShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class AccountProfileShowController {
  static docs = defineDocs({
    summary: 'Read own account',
    description:
      'The own account, whatever the role. The user always comes from the session: there is no ' +
      'identifier in the path, and there could not be - the scope comes from the token, never from the ' +
      'payload.\n\n' +
      'The avatar comes preloaded, with the `url` derived at serialization.',
  })

  constructor(private readonly useCase: AccountProfileShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute({ actor: context.actor })

    if (result.isLeft()) throw result.value

    return context.response.ok(result.value)
  }
}
