import type Sport from '#models/sport'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'

/**
 * A lista de uma turma na modalidade: `total` alunos da mesma turma, todos
 * inscritos. É o que trava apagar a modalidade e baixar o máximo de atletas.
 */
export async function enrollRoster(sport: Sport, total: number) {
  const classroom = await ClassroomFactory.create()
  const students = await StudentFactory.merge({ classroomId: classroom.id }).createMany(total)

  return EnrollmentFactory.merge(
    students.map((student) => ({ studentId: student.id, sportId: sport.id })),
  ).createMany(total)
}
