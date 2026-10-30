import type { AdvisorStudentShowResponse } from '@interclasse/shared'

import type { Student } from '#domain/student/student.entity'

/**
 * O aluno na forma da resposta do `shared/` (`_standards/architecture.md` §10):
 * campo que não está no schema não chega à resposta.
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
