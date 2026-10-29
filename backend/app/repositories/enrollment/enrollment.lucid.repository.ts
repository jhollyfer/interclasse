import { inject } from '@adonisjs/core'
import type { AdvisorEnrollmentShowResponse } from '@interclasse/shared'

import {
  EnrollmentRepository,
  type EnrollmentKey,
  type EnrollmentSport,
  type EnrollmentStudent,
} from './enrollment.repository.ts'

import BracketModel from '#models/bracket'
import ClassroomModel from '#models/classroom'
import EnrollmentModel from '#models/enrollment'
import SportModel from '#models/sport'
import StudentModel from '#models/student'
import { Enrollment } from '#domain/enrollment/enrollment.entity'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

@inject()
export class EnrollmentLucidRepository extends EnrollmentRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findSport(sportId: string): Promise<EnrollmentSport | null> {
    const row = await SportModel.query({ client: this.transaction.client() })
      .where('id', sportId)
      .first()
    if (!row) return null

    return { id: row.id, maxAthletes: row.maxAthletes }
  }

  async studentsOf(classroomId: string): Promise<EnrollmentStudent[]> {
    const rows = await StudentModel.query({ client: this.transaction.client() })
      .where('classroomId', classroomId)
      .orderBy('name', 'asc')

    return rows.map((row) => ({ id: row.id, name: row.name }))
  }

  async isDrawn(key: EnrollmentKey): Promise<boolean> {
    const client = this.transaction.client()
    const classroom = await ClassroomModel.query({ client }).where('id', key.classroomId).first()
    if (!classroom) return false

    const bracket = await BracketModel.query({ client })
      .where('sportId', key.sportId)
      .where('category', classroom.category)
      .first()

    return Boolean(bracket)
  }

  async findForUpdate(key: EnrollmentKey): Promise<Enrollment> {
    const client = this.transaction.client()
    await SportModel.query({ client }).where('id', key.sportId).forUpdate().first()

    const rows = await EnrollmentModel.query({ client })
      .where('sportId', key.sportId)
      .whereIn('studentId', this.studentIdsOf(key.classroomId))

    return Enrollment.restore({
      classroomId: key.classroomId,
      sportId: key.sportId,
      studentIds: rows.map((row) => row.studentId),
    })
  }

  async save(enrollment: Enrollment): Promise<void> {
    const { classroomId, sportId, studentIds } = enrollment.snapshot()
    const client = this.transaction.client()

    await EnrollmentModel.query({ client })
      .where('sportId', sportId)
      .whereIn('studentId', this.studentIdsOf(classroomId))
      .delete()

    if (studentIds.length > 0)
      await EnrollmentModel.createMany(
        studentIds.map((studentId) => ({ studentId, sportId })),
        { client },
      )
  }

  async board(criteria: {
    readonly classroomId: string
    readonly lockAfterDraw: boolean
  }): Promise<AdvisorEnrollmentShowResponse | null> {
    const client = this.transaction.client()
    const classroom = await ClassroomModel.query({ client })
      .where('id', criteria.classroomId)
      .first()
    if (!classroom) return null

    const [sports, students, drawn] = await Promise.all([
      SportModel.query({ client }).orderBy('name', 'asc'),
      StudentModel.query({ client })
        .where('classroomId', classroom.id)
        .preload('enrollments')
        .orderBy('name', 'asc'),
      BracketModel.query({ client }).where('category', classroom.category).select('sportId'),
    ])

    const locked = new Set(drawn.map((bracket) => bracket.sportId))

    return {
      classroom: { id: classroom.id, name: classroom.name, category: classroom.category },
      sports: sports.map((sport) => ({
        id: sport.id,
        name: sport.name,
        minAthletes: sport.minAthletes,
        maxAthletes: sport.maxAthletes,
        drawn: locked.has(sport.id),
        locked: criteria.lockAfterDraw && locked.has(sport.id),
      })),
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        sportIds: student.enrollments.map((enrollment) => enrollment.sportId),
      })),
    }
  }

  /** Os alunos da turma como subconsulta, para recortar a lista dela. */
  private studentIdsOf(classroomId: string) {
    return StudentModel.query({ client: this.transaction.client() })
      .where('classroomId', classroomId)
      .select('id')
  }
}
