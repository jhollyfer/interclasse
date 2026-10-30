import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import RepresentativeEnrollmentUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { RepresentativeEnrollmentUpdateValidator } from '#validators/representative/enrollments.validator'

@inject()
export default class RepresentativeEnrollmentUpdateController {
  static docs = defineDocs({
    description:
      'Acrescenta atletas da própria turma numa modalidade: a lista enviada é a nova lista ' +
      'inteira, e precisa conter todos os atletas já inscritos - tirar alguém é do professor ' +
      'conselheiro (`403`). Só alunos da turma; depois do sorteio, `409`.',
    // Nascem na entidade e são traduzidos em `_shared.enrollment-refusal.ts`, fora da
    // pasta da ação: o introspector não os lê sozinho.
    errors: {
      403: 'ENROLLMENT_REMOVAL_FORBIDDEN',
      409: 'ENROLLMENT_LOCKED',
      422: ['SPORT_NOT_FOUND', 'STUDENT_NOT_FOUND', 'ENROLLMENT_LIMIT_EXCEEDED'],
    },
  })

  constructor(private readonly useCase: RepresentativeEnrollmentUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(RepresentativeEnrollmentUpdateValidator)
    const result = await this.useCase.execute({ ...payload, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
