import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { BracketPaginateValidator } from '#features/administrator/brackets/brackets.validator'

@inject()
export default class AdministratorBracketPaginateController {
  static docs = defineDocs({
    description: 'As chaves sorteadas, da mais nova para a mais antiga.',
  })

  constructor(private readonly useCase: AdministratorBracketPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await BracketPaginateValidator.validate(context.request.qs())
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
