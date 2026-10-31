import type { ApiClient } from '@japa/api-client'
import { CATEGORY } from '@interclasse/shared'

import { BracketFactory } from '#database/factories/bracket.factory'
import { MatchFactory } from '#database/factories/match.factory'
import { TeamFactory } from '#database/factories/team.factory'
import { body, type Session } from '#tests/http-fixtures'

/**
 * The assembly of the bracket and match specs.
 *
 * Two paths, and each spec uses what the action asks for: the draw through the route
 * (`draw`), when the test depends on the whole bracket - phases, bye, winner
 * advancing -, and the standalone match through the factory (`scheduledMatch`), when
 * a row with the two teams is enough.
 */

export async function createSport(
  client: ApiClient,
  admin: Session,
  minAthletes = 1,
  name = 'Futsal',
) {
  const response = await client
    .post('/administrator/sports')
    .cookies(admin)
    .json({ name, minAthletes, maxAthletes: 3 })

  response.assertStatus(201)

  return body(response)
}

/** Creates `total` classrooms from 6th to 9th grade, each with one student enrolled in the sport. */
export async function enrolledClassrooms(
  client: ApiClient,
  admin: Session,
  sportId: string,
  total: number,
) {
  const ids: string[] = []

  for (let index = 0; index < total; index++) {
    const classroom = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({
        name: `${6 + (index % 4)}º ${String.fromCharCode(65 + index)}`,
        grade: 6 + (index % 4),
      })

    classroom.assertStatus(201)

    const student = await client
      .post('/advisor/students')
      .cookies(admin)
      .json({ classroomId: body(classroom).id, name: `Aluno ${index}` })

    student.assertStatus(201)

    const enrollment = await client
      .put('/advisor/enrollments')
      .cookies(admin)
      .json({ classroomId: body(classroom).id, sportId, studentIds: [body(student).id] })

    enrollment.assertStatus(200)
    ids.push(body(classroom).id)
  }

  return ids
}

export async function draw(client: ApiClient, admin: Session, sportId: string) {
  const response = await client
    .post('/administrator/brackets')
    .cookies(admin)
    .json({ sportId, category: CATEGORY.F2 })

  response.assertStatus(201)

  return body(response)
}

/** Sport, `total` enrolled classrooms and the draw, all through the route. */
export async function drawnBracket(client: ApiClient, admin: Session, total: number) {
  const sport = await createSport(client, admin)
  const classroomIds = await enrolledClassrooms(client, admin, sport.id, total)
  const bracket = await draw(client, admin, sport.id)

  return { sport, classroomIds, bracket }
}

/** Enters 2 x 1 on every match of the phase that already has both teams. */
export async function scoreAll(
  client: ApiClient,
  admin: Session,
  bracketId: string,
  phase: string,
) {
  const detail = await client.get(`/administrator/brackets/${bracketId}`).cookies(admin)

  for (const match of body(detail).matches) {
    if (match.phase !== phase || !match.homeTeamId || !match.awayTeamId) continue

    const response = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: 2, awayScore: 1 })

    response.assertStatus(200)
  }
}

/**
 * A standalone final with both teams defined and no score: the bracket, the two
 * classrooms and the match come out of the factory.
 */
export async function scheduledMatch() {
  const bracket = await BracketFactory.with('sport').create()
  const home = await TeamFactory.with('classroom').merge({ bracketId: bracket.id }).create()
  const away = await TeamFactory.with('classroom').merge({ bracketId: bracket.id }).create()
  const match = await MatchFactory.merge({
    bracketId: bracket.id,
    homeTeamId: home.id,
    awayTeamId: away.id,
  }).create()

  return { bracket, home, away, match }
}
