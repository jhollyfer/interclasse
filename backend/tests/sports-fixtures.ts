import type Sport from '#models/sport'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { EnrollmentFactory } from '#database/factories/enrollment.factory'

/**
 * A classroom's list in the sport: `total` students of the same classroom, all
 * enrolled. It is what locks deleting the sport and lowering the maximum of athletes.
 */
export async function enrollRoster(sport: Sport, total: number) {
  const classroom = await ClassroomFactory.create()
  const students = await StudentFactory.merge({ classroomId: classroom.id }).createMany(total)

  return EnrollmentFactory.merge(
    students.map((student) => ({ studentId: student.id, sportId: sport.id })),
  ).createMany(total)
}
