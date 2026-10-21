import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorCardPaginateUseCase from './paginate.use-case.ts'

import Classroom from '#models/classroom'
import ClassroomPolicy from '#policies/classroom.policy'
import { defineDocs } from '#core/openapi/types'
import { CardPaginateValidator } from '#features/advisor/cards/cards.validator'

@inject()
export default class AdvisorCardPaginateController {
  static docs = defineDocs({
    description:
      'Os cartões que os atletas da turma levaram, do mais novo ao mais antigo. Turma ' +
      'alheia responde `404`.',
  })

  constructor(private readonly useCase: AdvisorCardPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(CardPaginateValidator, {
      data: context.request.qs(),
    })
    const classroom = await Classroom.find(payload.classroomId)
    await context.bouncer.with(ClassroomPolicy).authorize('manage', classroom)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
