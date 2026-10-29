import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorEnrollmentShowUseCase from './show.use-case.ts'

import Classroom from '#models/classroom'
import ClassroomPolicy from '#policies/classroom.policy'
import { defineDocs } from '#core/openapi/types'
import { EnrollmentShowValidator } from '#features/advisor/enrollments/enrollments.validator'

@inject()
export default class AdvisorEnrollmentShowController {
  static docs = defineDocs({
    description:
      'A matriz aluno x modalidade de uma turma do conselheiro: quem está inscrito em quê, e ' +
      'quais modalidades já travaram pelo sorteio.',
  })

  constructor(private readonly useCase: AdvisorEnrollmentShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(EnrollmentShowValidator, {
      data: context.request.qs(),
    })
    // A regra por registro passa pelo Bouncer (_standards/backend.md §4.6); turma
    // alheia ou ausente é `404`, decidido pela policy.
    const classroom = await Classroom.find(payload.classroomId)
    await context.bouncer.with(ClassroomPolicy).authorize('manage', classroom)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
