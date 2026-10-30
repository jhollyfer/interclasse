import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import {
  USER_ROLE,
  type Actor,
  type AdvisorStudentShowResponse,
  type Paginated,
} from '@interclasse/shared'

import { StudentRepository, type StudentListCriteria } from './student.repository.ts'

import BracketModel from '#models/bracket'
import ClassroomModel from '#models/classroom'
import EnrollmentModel from '#models/enrollment'
import StudentModel from '#models/student'
import { Student } from '#domain/student/student.entity'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

@inject()
export class StudentLucidRepository extends StudentRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findOwned(criteria: {
    readonly id: string
    readonly actor: Actor
  }): Promise<Student | null> {
    const query = StudentModel.query({ client: this.transaction.client() }).where('id', criteria.id)
    this.scope(query, criteria.actor)

    const row = await query.first()
    if (!row) return null

    return this.toEntity(row)
  }

  async isInDrawnSport(studentId: string): Promise<boolean> {
    const client = this.transaction.client()
    const student = await StudentModel.query({ client })
      .where('id', studentId)
      .preload('classroom')
      .first()
    if (!student) return false

    const locked = await EnrollmentModel.query({ client })
      .where('studentId', studentId)
      .whereIn(
        'sportId',
        BracketModel.query({ client })
          .where('category', student.classroom.category)
          .select('sportId'),
      )
      .first()

    return Boolean(locked)
  }

  async save(student: Student): Promise<void> {
    const { id, createdAt, updatedAt, ...columns } = student.snapshot()

    await StudentModel.updateOrCreate(
      { id },
      {
        ...columns,
        createdAt: DateTime.fromJSDate(createdAt),
        updatedAt: this.dateOrNull(updatedAt),
      },
      { client: this.transaction.client() },
    )
  }

  async delete(student: Student): Promise<void> {
    await StudentModel.query({ client: this.transaction.client() }).where('id', student.id).delete()
  }

  async paginate(criteria: StudentListCriteria): Promise<Paginated<AdvisorStudentShowResponse>> {
    const query = StudentModel.query({ client: this.transaction.client() })
    this.scope(query, criteria.actor)

    if (criteria.classroomId) query.where('classroomId', criteria.classroomId)
    if (criteria.search) query.whereILike('name', `%${criteria.search}%`)

    const page = await query.orderBy('name', 'asc').paginate(criteria.page, criteria.perPage)

    return { meta: page.getMeta(), data: page.all().map((row) => this.toResponse(row)) }
  }

  /**
   * O recorte de alcance é uma subconsulta, e não uma checagem antes: turma
   * alheia responde vazio em vez de confirmar que existe. Quem não é
   * administrador alcança só a turma que aconselha (fail-closed, `backend.md` §4.6).
   */
  private scope(query: ReturnType<typeof StudentModel.query>, actor: Actor): void {
    if (actor.role === USER_ROLE.ADMINISTRATOR) return

    query.whereIn(
      'classroomId',
      ClassroomModel.query({ client: this.transaction.client() })
        .where('advisorId', actor.id)
        .select('id'),
    )
  }

  private toEntity(row: StudentModel): Student {
    return Student.restore({
      id: row.id,
      classroomId: row.classroomId,
      name: row.name,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
    })
  }

  private toResponse(row: StudentModel): AdvisorStudentShowResponse {
    return {
      id: row.id,
      classroomId: row.classroomId,
      name: row.name,
      createdAt: row.createdAt.toISO() ?? '',
      updatedAt: row.updatedAt?.toISO() ?? null,
    }
  }

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
