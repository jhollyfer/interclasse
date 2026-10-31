import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorReportShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class AdministratorReportShowController {
  static docs = defineDocs({
    summary: 'Games report',
    description:
      'How many classrooms, students and athletes took part: in total, by category, by ' +
      'sport and by classroom, plus the matches played and scheduled. An athlete is a student ' +
      'enrolled in at least one sport.',
  })

  constructor(private readonly useCase: AdministratorReportShowUseCase) {}

  async handle(context: HttpContext) {
    const result = await this.useCase.execute()
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
