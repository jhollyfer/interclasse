import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorEnrollmentUpdateUseCase from './update.use-case.ts'

import Classroom from '#models/classroom'
import ClassroomPolicy from '#policies/classroom.policy'
import { defineDocs } from '#core/openapi/types'
import { EnrollmentUpdateValidator } from '#features/advisor/enrollments/enrollments.validator'

@inject()
export default class AdvisorEnrollmentUpdateController {
  static docs = defineDocs({
    description:
      'Troca a lista de atletas da turma numa modalidade pela enviada, inteira. Responde a ' +
      'matriz atualizada. Vale também depois do sorteio: o time sorteado é a turma. Tirar ' +
      'atleta exige `reason`, que vira aviso para a organização.',
    // Nascem no `EnrollmentService`, fora da leitura de AST do gerador.
    errors: {
      422: [
        'SPORT_NOT_FOUND',
        'STUDENT_NOT_FOUND',
        'ENROLLMENT_LIMIT_EXCEEDED',
        'ENROLLMENT_REASON_REQUIRED',
      ],
    },
  })

  constructor(private readonly useCase: AdvisorEnrollmentUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(EnrollmentUpdateValidator)
    const classroom = await Classroom.find(payload.classroomId)
    await context.bouncer.with(ClassroomPolicy).authorize('manage', classroom)
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
