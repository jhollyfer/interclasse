import type { ApiClient } from '@japa/api-client'

import type Classroom from '#models/classroom'
import type Sport from '#models/sport'
import { BracketFactory } from '#database/factories/bracket.factory'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { MatchFactory } from '#database/factories/match.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { TeamFactory } from '#database/factories/team.factory'
import { Classroom as ClassroomEntity } from '#domain/classroom/classroom.entity'
import { signInWithFactory } from '#tests/http-fixtures'

/** A classroom with `total` students, in place of the inverse relation the model does not declare. */
export async function classroomWithStudents(total: number): Promise<Classroom> {
  const classroom = await ClassroomFactory.create()
  await StudentFactory.merge({ classroomId: classroom.id }).createMany(total)

  return classroom
}

/**
 * A teacher advisor with a session and the classroom they advise. It is the starting
 * point of every `/advisor` spec: the policy only lets the advisor's own classroom
 * through.
 */
export async function signInAsAdvisorOfClassroom(client: ApiClient) {
  const { user, session } = await signInWithFactory(client)
  const classroom = await ClassroomFactory.merge({ advisorId: user.id }).create()

  return { user, session, classroom }
}

/**
 * A representative with a session and the classroom they represent. In
 * `/representative` the classroom comes from the session, so the link is what the route reads.
 */
export async function signInAsRepresentativeOfClassroom(client: ApiClient) {
  const { user, session } = await signInWithFactory(client, 'representative')
  const classroom = await ClassroomFactory.merge({ representativeId: user.id }).create()

  return { user, session, classroom }
}

/**
 * Closes the sport in the classroom's category, as the draw would: the bracket
 * existing is what locks enrollments.
 */
export function drawSport(sport: Sport, classroom: Classroom) {
  return BracketFactory.merge({ sportId: sport.id, category: classroom.category }).create()
}

/**
 * A classroom already in a drawn bracket: the `teams` row that links it to a bracket.
 *
 * It is the state that locks `delete` and the category change in `update`. It does
 * not go through the draw, which requires a sport, enrollments and other classrooms:
 * for the guard it is enough that the classroom has a team.
 */
export async function drawnClassroom(grade = 7) {
  const classroom = await ClassroomFactory.merge({
    grade,
    category: ClassroomEntity.categoryOf(grade),
  }).create()
  const bracket = await BracketFactory.with('sport').create()

  await TeamFactory.merge({ bracketId: bracket.id, classroomId: classroom.id }).create()

  return classroom
}

/**
 * A match with both teams defined and a student in each classroom: the minimum
 * to enter a card.
 */
export async function matchWithTeams() {
  const bracket = await BracketFactory.with('sport').create()
  const [home, away] = await ClassroomFactory.merge({
    grade: 3,
    category: ClassroomEntity.categoryOf(3),
  }).createMany(2)
  if (!home || !away) throw new Error('factory created fewer classrooms than requested')
  const homeTeam = await TeamFactory.merge({ bracketId: bracket.id, classroomId: home.id }).create()
  const awayTeam = await TeamFactory.merge({ bracketId: bracket.id, classroomId: away.id }).create()
  const match = await MatchFactory.merge({
    bracketId: bracket.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
  }).create()
  const homeStudent = await StudentFactory.merge({ classroomId: home.id }).create()
  const awayStudent = await StudentFactory.merge({ classroomId: away.id }).create()

  return { bracket, match, home, away, homeTeam, awayTeam, homeStudent, awayStudent }
}
