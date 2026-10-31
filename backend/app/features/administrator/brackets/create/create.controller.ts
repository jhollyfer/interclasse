import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorBracketCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorBracketCreateValidator } from '#validators/administrator/brackets.validator'

@inject()
export default class AdministratorBracketCreateController {
  static docs = defineDocs({
    summary: 'Draw bracket',
    description:
      'The draw of the sport in a category. The classrooms of the category with at least ' +
      '`minAthletes` enrolled enter; they are shuffled and the knockout bracket is built ' +
      'whole, from the first phase to the final.\n\n' +
      'When the number of classrooms does not fill a power of two (4, 8, 16), the ones left over ' +
      'get a bye and go straight into the next phase. Up to 16 classrooms per bracket.\n\n' +
      'After the draw the enrollments of the sport in that category lock. To redo it, ' +
      'delete the bracket.\n\n' +
      'Idempotent per sport and category: if the bracket already exists, the response is 200 with ' +
      'it, without a new draw - a resend after a network drop leads to the same bracket.',
  })

  constructor(private readonly useCase: AdministratorBracketCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorBracketCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    const { bracket, created } = result.value
    if (created) return context.response.created(bracket)
    return context.response.ok(bracket)
  }
}
