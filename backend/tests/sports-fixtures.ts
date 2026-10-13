import type Sport from '#models/sport'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'

/**
 * A lista de uma turma na modalidade: `total` alunos da mesma turma, todos
 * inscritos. É o que trava apagar a modalidade e baixar o máximo de atletas.
 */
export async function enrollRoster(sport: Sport, total: number) {
  const classroom = await ClassroomFactory.with('students', total).create()

  return EnrollmentFactory.merge(
    classroom.students.map((student) => ({ studentId: student.id, sportId: sport.id })),
  ).createMany(total)
}
