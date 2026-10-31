import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorSportUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorSportUpdateValidator } from '#validators/administrator/sports.validator'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorSportUpdateController {
  static docs = defineDocs({
    description:
      'A missing field means "leave alone". Changing the name changes the `slug`, and with it the address of the ' +
      'sport on the site.',
  })

  constructor(private readonly useCase: AdministratorSportUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdministratorSportUpdateValidator)
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute({ ...body, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
