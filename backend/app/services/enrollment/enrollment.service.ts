import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { USER_ROLE, left, right, type Either } from '@interclasse/shared'

import type { Infer } from '#core/validator'
import { type EnrollmentBoardResponse } from '#core/openapi/response'
import Bracket from '#models/bracket'
import type Classroom from '#models/classroom'
import Enrollment from '#models/enrollment'
import EnrollmentRemoval from '#models/enrollment-removal'
import Sport from '#models/sport'
import Student from '#models/student'
import type User from '#models/user'
import HTTPException from '#exceptions/http.exception'

/** A forma sai do schema de resposta, nunca de um tipo redigido ao lado dele (_standards/typescript.md §2). */
export type EnrollmentBoard = Infer<typeof EnrollmentBoardResponse>

/**
 * Quem escreve a lista, e o que isso permite.
 *
 * O representante só acrescenta, e só antes do sorteio. O conselheiro (e o
 * administrador, que cobre a falta dele) mexe a qualquer momento - inclusive
 * depois do sorteio, porque o time sorteado é a turma, e trocar quem joga por
 * ela não muda a chave. Tirar atleta exige o motivo, que vira aviso para a
 * organização.
 */
export type EnrollmentWriter =
  | { readonly role: 'representative' }
  | { readonly role: 'advisor'; readonly actor: User; readonly reason?: string }

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
  /**
   * A matriz aluno x modalidade da turma. `lockAfterDraw` é o que diferencia
   * as duas telas: só a do representante trava na modalidade sorteada.
   */
  async board(
    classroom: Classroom,
    { lockAfterDraw }: { lockAfterDraw: boolean },
  ): Promise<EnrollmentBoard> {
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
        drawn: locked.has(sport.id),
        locked: lockAfterDraw && locked.has(sport.id),
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
   */
  async replace(
    classroom: Classroom,
    sportId: string,
    studentIds: string[],
    writer: EnrollmentWriter,
  ): Promise<Either<HTTPException, EnrollmentBoard>> {
    const sport = await Sport.find(sportId)

    if (!sport)
      return left(
        HTTPException.UnprocessableEntity('Modalidade não encontrada', 'SPORT_NOT_FOUND', {
          sportId: 'Modalidade não encontrada',
        }),
      )

    if (studentIds.length > sport.maxAthletes)
      return left(
        HTTPException.UnprocessableEntity('Atletas demais', 'ENROLLMENT_LIMIT_EXCEEDED', {
          studentIds: `Inscreva no máximo ${sport.maxAthletes} atletas`,
        }),
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
        }),
      )

    const kept = new Set(studentIds)

    const outcome = await db.transaction(async (trx) => {
      // A mesma trava do sorteio, e a checagem do sorteio só depois dela: lida
      // antes, a lista podia ser gravada depois de a chave ser fechada.
      await Sport.query({ client: trx }).where('id', sport.id).forUpdate().first()

      const current = await Enrollment.query({ client: trx })
        .where('sportId', sport.id)
        .whereIn(
          'studentId',
          Student.query({ client: trx }).where('classroomId', classroom.id).select('id'),
        )
        .preload('student')
      const removed = current.filter((enrollment) => !kept.has(enrollment.studentId))

      if (writer.role === 'representative') {
        // O representante só acrescenta: tirar atleta da lista é decisão do
        // professor conselheiro. A lista enviada precisa conter toda a atual.
        if (removed.length > 0) return 'removal-forbidden'

        // Depois do sorteio a lista do representante trava: a partir daí quem
        // mexe é o conselheiro, que responde pela troca.
        const drawn = await Bracket.query({ client: trx })
          .where('sportId', sport.id)
          .where('category', classroom.category)
          .first()

        if (drawn) return 'locked'
      }

      if (writer.role === 'advisor' && removed.length > 0) {
        if (!writer.reason) return 'reason-required'

        // O administrador não avisa a si mesmo: a remoção dele já nasce lida.
        let acknowledgedAt: DateTime | null = null
        if (writer.actor.role === USER_ROLE.ADMINISTRATOR) acknowledgedAt = DateTime.now()

        await EnrollmentRemoval.createMany(
          removed.map((enrollment) => ({
            classroomId: classroom.id,
            sportId: sport.id,
            studentId: enrollment.studentId,
            studentName: enrollment.student.name,
            reason: writer.reason ?? '',
            actorId: writer.actor.id,
            acknowledgedAt,
          })),
          { client: trx },
        )
      }

      await Enrollment.query({ client: trx })
        .where('sportId', sport.id)
        .whereIn(
          'studentId',
          Student.query({ client: trx }).where('classroomId', classroom.id).select('id'),
        )
        .delete()

      if (studentIds.length > 0)
        await Enrollment.createMany(
          studentIds.map((studentId) => ({ studentId, sportId: sport.id })),
          { client: trx },
        )

      return 'saved'
    })

    if (outcome === 'removal-forbidden')
      return left(
        HTTPException.Forbidden(
          'Só o professor conselheiro tira atleta da lista',
          'ENROLLMENT_REMOVAL_FORBIDDEN',
        ),
      )

    if (outcome === 'locked')
      return left(
        HTTPException.Conflict(
          'As inscrições desta modalidade estão encerradas: o sorteio já aconteceu',
          'ENROLLMENT_LOCKED',
        ),
      )

    if (outcome === 'reason-required')
      return left(
        HTTPException.UnprocessableEntity(
          'Informe o motivo da remoção',
          'ENROLLMENT_REASON_REQUIRED',
          { reason: 'Diga por que o atleta saiu da lista' },
        ),
      )

    return right(await this.board(classroom, { lockAfterDraw: writer.role === 'representative' }))
  }
}
