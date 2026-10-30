import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type Actor,
  type AdvisorStudentShowResponse,
  type Either,
  type Merge,
  type Paginated,
} from '@interclasse/shared'

import { StudentRepository } from '#repositories/student/student.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorStudentPaginatePayload } from '#validators/advisor/students.validator'

type Payload = Merge<AdvisorStudentPaginatePayload, { actor: Actor }>
type Response = Either<HTTPException, Paginated<AdvisorStudentShowResponse>>

@inject()
export default class AdvisorStudentPaginateUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ actor, ...payload }: Payload): Promise<Response> {
    try {
      return right(
        await this.students.paginate({
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          search: payload.search,
          classroomId: payload.classroomId,
          actor,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[advisor/students > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_STUDENT_PAGINATE_ERROR',
        ),
      )
    }
  }
}
