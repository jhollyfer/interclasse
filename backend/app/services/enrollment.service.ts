import Bracket from '#models/bracket'
import type Classroom from '#models/classroom'
import Enrollment from '#models/enrollment'
import Sport from '#models/sport'
import Student from '#models/student'
import db from '@adonisjs/lucid/services/db'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import type { Category } from '#core/entity'

export type EnrollmentBoard = {
  classroom: { id: string; name: string; category: Category }
  sports: Array<{
    id: string
    name: string
    minAthletes: number
    maxAthletes: number
    locked: boolean
  }>
  students: Array<{ id: string; name: string; sportIds: string[] }>
}

/**
 * As inscrições de uma turma: quem joga o quê.
 *
 * Service, e não `_shared`, porque fala com o banco; e um só para os dois
 * caminhos que escrevem aqui - o conselheiro (`/advisor/enrollments`) e o
 * representante (`/representative/enrollments`). A regra de trava e de limite
 * escrita duas vezes divergiria, e a divergência seria um representante
 * conseguindo o que o conselheiro não consegue.
 *
 * Quem pode mexer em qual turma **não** é decidido aqui: chega resolvido pelo
 * caso de uso, pela policy ou pela sessão.
 */
export default class EnrollmentService {
  /** A matriz aluno x modalidade da turma. */
  async board(classroom: Classroom): Promise<EnrollmentBoard> {
    const [sports, students, drawn] = await Promise.all([
      Sport.query().orderBy('name', 'asc'),
      Student.query()
        .where('classroomId', classroom.id)
        .preload('enrollments')
        .orderBy('name', 'asc'),
      Bracket.query().where('category', classroom.category).select('sportId'),
    ])

    const locked = new Set(drawn.map((bracket) => bracket.sportId))

    return {
      classroom: { id: classroom.id, name: classroom.name, category: classroom.category },
      sports: sports.map((sport) => ({
        id: sport.id,
        name: sport.name,
        minAthletes: sport.minAthletes,
        maxAthletes: sport.maxAthletes,
        locked: locked.has(sport.id),
      })),
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        sportIds: student.enrollments.map((enrollment) => enrollment.sportId),
      })),
    }
  }

  /**
   * Troca a lista de atletas da turma numa modalidade pela recebida.
   *
   * A lista é inteira, e não um aluno por vez: a tela é uma coluna de caixas
   * marcadas, e o que ela tem para mandar é o estado final. Diferença calculada
   * no cliente esbarraria em duas abas abertas.
   *
   * Trava depois do sorteio: o time já está na chave, e mudar quem joga ali
   * mudaria o time que foi sorteado.
   */
  async replace(
    classroom: Classroom,
    sportId: string,
    studentIds: string[],
    { canRemove }: { canRemove: boolean }
  ): Promise<Either<HTTPException, EnrollmentBoard>> {
    const sport = await Sport.find(sportId)

    if (!sport)
      return left(
        HTTPException.UnprocessableEntity('Modalidade não encontrada', 'SPORT_NOT_FOUND', {
          sportId: 'Modalidade não encontrada',
        })
      )

    // O representante só acrescenta: tirar atleta da lista é decisão do
    // professor conselheiro. A lista enviada precisa conter toda a atual.
    if (!canRemove) {
      const current = await Enrollment.query()
        .where('sportId', sport.id)
        .whereIn('studentId', Student.query().where('classroomId', classroom.id).select('id'))
        .select('studentId')
      const kept = new Set(studentIds)

      if (current.some((enrollment) => !kept.has(enrollment.studentId)))
        return left(
          HTTPException.Forbidden(
            'Só o professor conselheiro tira atleta da lista',
            'ENROLLMENT_REMOVAL_FORBIDDEN'
          )
        )
    }

    if (studentIds.length > sport.maxAthletes)
      return left(
        HTTPException.UnprocessableEntity('Atletas demais', 'ENROLLMENT_LIMIT_EXCEEDED', {
          studentIds: `Inscreva no máximo ${sport.maxAthletes} atletas`,
        })
      )

    // Todo aluno da lista tem que ser desta turma. Sem isto, um representante
    // inscreveria aluno de outra turma pelo uuid.
    const students = await Student.query()
      .whereIn('id', studentIds)
      .where('classroomId', classroom.id)
      .select('id')

    if (students.length !== studentIds.length)
      return left(
        HTTPException.UnprocessableEntity('Aluno não encontrado na turma', 'STUDENT_NOT_FOUND', {
          studentIds: 'Selecione apenas alunos desta turma',
        })
      )

    const saved = await db.transaction(async (trx) => {
      // A mesma trava do sorteio, e a checagem do sorteio só depois dela: lida
      // antes, a lista podia ser gravada depois de a chave ser fechada.
      await Sport.query({ client: trx }).where('id', sport.id).forUpdate().first()

      const drawn = await Bracket.query({ client: trx })
        .where('sportId', sport.id)
        .where('category', classroom.category)
        .first()

      if (drawn) return false

      const classStudents = Student.query({ client: trx })
        .where('classroomId', classroom.id)
        .select('id')

      await Enrollment.query({ client: trx })
        .where('sportId', sport.id)
        .whereIn('studentId', classStudents)
        .delete()

      if (studentIds.length > 0)
        await Enrollment.createMany(
          studentIds.map((studentId) => ({ studentId, sportId: sport.id })),
          { client: trx }
        )

      return true
    })

    if (!saved)
      return left(
        HTTPException.Conflict(
          'As inscrições desta modalidade estão encerradas: o sorteio já aconteceu',
          'ENROLLMENT_LOCKED'
        )
      )

    return right(await this.board(classroom))
  }
}
