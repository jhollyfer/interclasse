import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSportUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { SportUpdateValidator } from '#validators/administrator/sports.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorSportUpdateController {
  static docs = defineDocs({
    description:
      'Campo ausente é "não mexer". Trocar o nome troca o `slug`, e com ele o endereço da ' +
      'modalidade no site.',
  })

  constructor(private readonly useCase: AdministratorSportUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(SportUpdateValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
