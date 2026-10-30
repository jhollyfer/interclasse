import { inject } from '@adonisjs/core'
import {
  CATEGORIES,
  MATCH_STATUS,
  type AdministratorReportShowResponse,
  type Category,
} from '@interclasse/shared'

import { ReportRepository } from './report.repository.ts'

import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

type ClassroomRow = AdministratorReportShowResponse['classrooms'][number]
type SportRow = AdministratorReportShowResponse['bySport'][number]

/** Tudo contado no banco, em consultas agregadas. */
@inject()
export class ReportLucidRepository extends ReportRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async summarize(): Promise<AdministratorReportShowResponse> {
    const client = this.transaction.client()
    const [classrooms, bySport, enrollments, sports, matches] = await Promise.all([
      this.classrooms(),
      this.sports(),
      client.from('enrollments').count('* as total').first(),
      client.from('sports').count('* as total').first(),
      client.from('matches').select('status').count('* as total').groupBy('status'),
    ])

    const played = matches.find((row) => row.status === MATCH_STATUS.FINISHED)
    const scheduled = matches.find((row) => row.status === MATCH_STATUS.SCHEDULED)

    return {
      totals: {
        classrooms: classrooms.length,
        students: this.sum(classrooms, 'students'),
        athletes: this.sum(classrooms, 'athletes'),
        enrollments: Number(enrollments?.total ?? 0),
        sports: Number(sports?.total ?? 0),
        matchesPlayed: Number(played?.total ?? 0),
        matchesScheduled: Number(scheduled?.total ?? 0),
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
      bySport,
      classrooms,
    }
  }

  private sum(rows: ReadonlyArray<ClassroomRow>, key: 'students' | 'athletes'): number {
    return rows.reduce((total, row) => total + row[key], 0)
  }

  /** Cada turma com as pessoas e os totais dela, em ordem de ano e nome. */
  private async classrooms(): Promise<ClassroomRow[]> {
    const client = this.transaction.client()
    const rows: Array<{
      id: string
      name: string
      category: Category
      advisor: string | null
      representative: string | null
      students: string | number
      athletes: string | number
      sports: string | number
    }> = await client
      .from('classrooms')
      .leftJoin('users as advisors', 'advisors.id', 'classrooms.advisor_id')
      .leftJoin('users as representatives', 'representatives.id', 'classrooms.representative_id')
      .leftJoin('students', 'students.classroom_id', 'classrooms.id')
      .leftJoin('enrollments', 'enrollments.student_id', 'students.id')
      .groupBy('classrooms.id', 'advisors.name', 'representatives.name')
      .orderBy('classrooms.grade')
      .orderBy('classrooms.name')
      .select(
        'classrooms.id',
        'classrooms.name',
        'classrooms.category',
        'advisors.name as advisor',
        'representatives.name as representative',
      )
      .select(client.raw('count(distinct students.id) as students'))
      .select(client.raw('count(distinct enrollments.student_id) as athletes'))
      .select(client.raw('count(distinct enrollments.sport_id) as sports'))

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      advisor: row.advisor,
      representative: row.representative,
      students: Number(row.students),
      athletes: Number(row.athletes),
      sports: Number(row.sports),
    }))
  }

  /** Cada modalidade com quantos atletas e quantas turmas têm inscritos nela. */
  private async sports(): Promise<SportRow[]> {
    const client = this.transaction.client()
    const rows: Array<{
      id: string
      name: string
      athletes: string | number
      classrooms: string | number
    }> = await client
      .from('sports')
      .leftJoin('enrollments', 'enrollments.sport_id', 'sports.id')
      .leftJoin('students', 'students.id', 'enrollments.student_id')
      .groupBy('sports.id')
      .orderBy('sports.name')
      .select('sports.id', 'sports.name')
      .select(client.raw('count(distinct enrollments.student_id) as athletes'))
      .select(client.raw('count(distinct students.classroom_id) as classrooms'))

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      athletes: Number(row.athletes),
      classrooms: Number(row.classrooms),
    }))
  }
}
