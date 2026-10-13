import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import StorefrontMatchPaginateUseCase from './paginate.use-case.ts'
import { StorefrontMatchPaginationValidator } from '#features/storefront/matches/matches.validator'

@inject()
export default class StorefrontMatchPaginateController {
  static docs = defineDocs({
    description:
      'A tabela de jogos do site: as próximas partidas com `?status=SCHEDULED`, os ' +
      'resultados com `?status=FINISHED`. Mesma ordem e filtros do painel.',
  })

  constructor(private readonly useCase: StorefrontMatchPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await StorefrontMatchPaginationValidator.validate(context.request.qs())
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
