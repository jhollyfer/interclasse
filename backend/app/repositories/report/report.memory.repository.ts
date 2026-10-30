import {
  CATEGORIES,
  MATCH_STATUS,
  type AdministratorReportShowResponse,
  type Category,
  type MatchStatus,
} from '@interclasse/shared'

import { ReportRepository } from './report.repository.ts'

type ClassroomRow = {
  readonly id: string
  readonly name: string
  readonly grade: number
  readonly category: Category
  readonly advisor: string | null
  readonly representative: string | null
}

type Count = AdministratorReportShowResponse['classrooms'][number]

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3): guarda as linhas cruas que o teste arranja e
 * conta delas, com as mesmas regras do SQL da implementação Lucid.
 */
export class ReportMemoryRepository extends ReportRepository {
  private readonly classroomRows: ClassroomRow[] = []
  private readonly studentRows: Array<{ id: string; classroomId: string }> = []
  private readonly sportRows: Array<{ id: string; name: string }> = []
  private readonly enrollmentRows: Array<{ studentId: string; sportId: string }> = []
  private readonly matchStatuses: MatchStatus[] = []

  /** Arranjo do teste: uma turma. */
  withClassroom(
    classroom: Omit<ClassroomRow, 'advisor' | 'representative'> & Partial<ClassroomRow>,
  ): this {
    this.classroomRows.push({ advisor: null, representative: null, ...classroom })
    return this
  }

  /** Arranjo do teste: um aluno da turma. */
  withStudent(id: string, classroomId: string): this {
    this.studentRows.push({ id, classroomId })
    return this
  }

  withSport(id: string, name: string): this {
    this.sportRows.push({ id, name })
    return this
  }

  /** Arranjo do teste: o aluno inscrito na modalidade. */
  withEnrollment(studentId: string, sportId: string): this {
    this.enrollmentRows.push({ studentId, sportId })
    return this
  }

  withMatch(status: MatchStatus): this {
    this.matchStatuses.push(status)
    return this
  }

  async summarize(): Promise<AdministratorReportShowResponse> {
    const classrooms = this.classrooms()

    return {
      totals: {
        classrooms: classrooms.length,
        students: this.sum(classrooms, 'students'),
        athletes: this.sum(classrooms, 'athletes'),
        enrollments: this.enrollmentRows.length,
        sports: this.sportRows.length,
        matchesPlayed: this.matchesIn(MATCH_STATUS.FINISHED),
        matchesScheduled: this.matchesIn(MATCH_STATUS.SCHEDULED),
      },
      byCategory: CATEGORIES.map((category) => {
        const rows = classrooms.filter((classroom) => classroom.category === category)

        return {
          category,
          classrooms: rows.length,
          students: this.sum(rows, 'students'),
          athletes: this.sum(rows, 'athletes'),
        }
      }),
      bySport: [...this.sportRows]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((sport) => this.sportCounts(sport)),
      classrooms,
    }
  }

  private classrooms(): Count[] {
    return [...this.classroomRows]
      .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name))
      .map((classroom) => {
        const students = this.studentRows.filter((student) => student.classroomId === classroom.id)
        const enrollments = this.enrollmentRows.filter((enrollment) =>
          students.some((student) => student.id === enrollment.studentId),
        )

        return {
          id: classroom.id,
          name: classroom.name,
          category: classroom.category,
          advisor: classroom.advisor,
          representative: classroom.representative,
          students: students.length,
          athletes: new Set(enrollments.map((enrollment) => enrollment.studentId)).size,
          sports: new Set(enrollments.map((enrollment) => enrollment.sportId)).size,
        }
      })
  }

  private sportCounts(sport: { id: string; name: string }) {
    const enrollments = this.enrollmentRows.filter((enrollment) => enrollment.sportId === sport.id)
    const classroomIds = enrollments.map(
      (enrollment) =>
        this.studentRows.find((student) => student.id === enrollment.studentId)?.classroomId,
    )

    return {
      id: sport.id,
      name: sport.name,
      athletes: new Set(enrollments.map((enrollment) => enrollment.studentId)).size,
      classrooms: new Set(classroomIds.filter((id) => id !== undefined)).size,
    }
  }

  private matchesIn(status: MatchStatus): number {
    return this.matchStatuses.filter((candidate) => candidate === status).length
  }

  private sum(rows: ReadonlyArray<Count>, key: 'students' | 'athletes'): number {
    return rows.reduce((total, row) => total + row[key], 0)
  }
}
