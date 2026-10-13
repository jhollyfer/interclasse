import Classroom from '#models/classroom'
import ClassroomPolicy from '#policies/classroom.policy'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdvisorEnrollmentShowUseCase from './show.use-case.ts'
import { AdvisorEnrollmentShowValidator } from '#core/validator'

@inject()
export default class AdvisorEnrollmentShowController {
  static docs = defineDocs({
    description:
      'A matriz aluno x modalidade de uma turma do conselheiro: quem está inscrito em quê, e ' +
      'quais modalidades já travaram pelo sorteio.',
  })

  constructor(private readonly useCase: AdvisorEnrollmentShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await AdvisorEnrollmentShowValidator.validate(context.request.qs())
    // A regra por registro passa pelo Bouncer (_padroes/backend.md §4.6); turma
    // alheia ou ausente é `404`, decidido pela policy.
    const classroom = await Classroom.find(payload.classroomId)
    await context.bouncer.with(ClassroomPolicy).authorize('manage', classroom)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
