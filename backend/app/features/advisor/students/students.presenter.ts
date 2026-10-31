import type { AdvisorStudentShowResponse } from '@interclasse/shared'

import type { Student } from '#domain/student/student.entity'

/**
 * The student in the shape of the `shared/` response (`_standards/architecture.md` §10):
 * a field that is not in the schema does not reach the response.
 */
export class StudentPresenter {
  static show(student: Student): AdvisorStudentShowResponse {
    const { id, classroomId, name, createdAt, updatedAt } = student.snapshot()

    return {
      id,
      classroomId,
      name,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt?.toISOString() ?? null,
    }
  }
}
