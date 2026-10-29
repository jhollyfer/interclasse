import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdvisorStudentCreateUseCase from './create.use-case.ts'

import Classroom from '#models/classroom'
import ClassroomPolicy from '#policies/classroom.policy'
import { defineDocs } from '#core/openapi/types'
import { StudentCreateValidator } from '#validators/advisor/students.validator'

@inject()
export default class AdvisorStudentCreateController {
  static docs = defineDocs({
    description: 'Cadastra o aluno numa turma do conselheiro. Turma alheia responde `404`.',
  })

  constructor(private readonly useCase: AdvisorStudentCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(StudentCreateValidator)
    const classroom = await Classroom.find(payload.classroomId)
    await context.bouncer.with(ClassroomPolicy).authorize('manage', classroom)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
