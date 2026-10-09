import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import StorefrontBracketPaginateUseCase from './paginate.use-case.ts'
import { StorefrontBracketPaginationValidator } from '#core/validator'

@inject()
export default class StorefrontBracketPaginateController {
  static docs = defineDocs({
    description: 'As chaves sorteadas, com a modalidade. É o índice da página de classificação.',
  })

  constructor(private readonly useCase: StorefrontBracketPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await StorefrontBracketPaginationValidator.validate(context.request.qs())
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
