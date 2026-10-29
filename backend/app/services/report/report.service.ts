import db from '@adonisjs/lucid/services/db'

import { CATEGORIES, MATCH_STATUS, type Category } from '#core/entity'

export type ClassroomReport = {
  readonly id: string
  readonly name: string
  readonly category: Category
  readonly advisor: string | null
  readonly representative: string | null
  readonly students: number
  readonly athletes: number
  readonly sports: number
}

export type SportReport = {
  readonly id: string
  readonly name: string
  readonly athletes: number
  readonly classrooms: number
}

export type CategoryReport = {
  readonly category: Category
  readonly classrooms: number
  readonly students: number
  readonly athletes: number
}

export type Report = {
  readonly totals: {
    readonly classrooms: number
    readonly students: number
    readonly athletes: number
    readonly enrollments: number
    readonly sports: number
    readonly matchesPlayed: number
    readonly matchesScheduled: number
  }
  readonly byCategory: ReadonlyArray<CategoryReport>
  readonly bySport: ReadonlyArray<SportReport>
  readonly classrooms: ReadonlyArray<ClassroomReport>
}

/**
 * Os números dos jogos: quantas turmas, alunos e atletas participaram, por
 * categoria, por modalidade e por turma.
 *
 * Service porque consulta o banco e serve a duas saídas - a tela e o CSV -,
 * que precisam dar os mesmos números. Tudo contado no banco, em consultas
 * agregadas; nenhuma linha de aluno sobe para a aplicação.
 */
export default class ReportService {
  async build(): Promise<Report> {
    const [classrooms, bySport, enrollments, sports, matches] = await Promise.all([
      this.classrooms(),
      this.sports(),
      db.from('enrollments').count('* as total').first(),
      db.from('sports').count('* as total').first(),
      db.from('matches').select('status').count('* as total').groupBy('status'),
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

  private sum(rows: ReadonlyArray<ClassroomReport>, key: 'students' | 'athletes'): number {
    return rows.reduce((total, row) => total + row[key], 0)
  }

  /** Cada turma com as pessoas e os totais dela, em ordem de ano e nome. */
  private async classrooms(): Promise<Array<ClassroomReport>> {
    const rows: Array<{
      id: string
      name: string
      category: Category
      advisor: string | null
      representative: string | null
      students: string | number
      athletes: string | number
      sports: string | number
    }> = await db
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
      .select(db.raw('count(distinct students.id) as students'))
      .select(db.raw('count(distinct enrollments.student_id) as athletes'))
      .select(db.raw('count(distinct enrollments.sport_id) as sports'))

    return rows.map((row) => ({
      ...row,
      students: Number(row.students),
      athletes: Number(row.athletes),
      sports: Number(row.sports),
    }))
  }

  /** Cada modalidade com quantos atletas e quantas turmas têm inscritos nela. */
  private async sports(): Promise<Array<SportReport>> {
    const rows: Array<{
      id: string
      name: string
      athletes: string | number
      classrooms: string | number
    }> = await db
      .from('sports')
      .leftJoin('enrollments', 'enrollments.sport_id', 'sports.id')
      .leftJoin('students', 'students.id', 'enrollments.student_id')
      .groupBy('sports.id')
      .orderBy('sports.name')
      .select('sports.id', 'sports.name')
      .select(db.raw('count(distinct enrollments.student_id) as athletes'))
      .select(db.raw('count(distinct students.classroom_id) as classrooms'))

    return rows.map((row) => ({
      ...row,
      athletes: Number(row.athletes),
      classrooms: Number(row.classrooms),
    }))
  }
}
