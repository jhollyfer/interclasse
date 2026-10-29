import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSiteUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { SiteUpdateValidator } from '#features/administrator/site/site.validator'

@inject()
export default class AdministratorSiteUpdateController {
  static docs = defineDocs({
    summary: 'Atualizar configuração do site',
    description:
      'Campo ausente é "não mexer"; `null` apaga. `regulationId` é um arquivo já ' +
      'enviado por `/storages` e precisa ser PDF.',
  })

  constructor(private readonly useCase: AdministratorSiteUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(SiteUpdateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
