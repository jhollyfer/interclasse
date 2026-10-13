import Student from '#models/student'
import ClassroomPolicy from '#policies/classroom.policy'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdvisorStudentDeleteUseCase from './delete.use-case.ts'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdvisorStudentDeleteController {
  static docs = defineDocs({
    description:
      'Tira o aluno da turma, com as inscrições dele. Aluno inscrito numa modalidade já ' +
      'sorteada responde `409`: o time sorteado perderia um atleta.',
  })

  constructor(private readonly useCase: AdvisorStudentDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await IdentifierValidator.validate(context.params)
    const student = await Student.query().where('id', payload.id).preload('classroom').first()
    await context.bouncer.with(ClassroomPolicy).authorize('manageStudent', student)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
