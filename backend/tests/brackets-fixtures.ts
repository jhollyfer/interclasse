import type { ApiClient } from '@japa/api-client'

import { CATEGORY } from '#core/entity'
import { BracketFactory } from '#database/factories/bracket.factory'
import { MatchFactory } from '#database/factories/match.factory'
import { TeamFactory } from '#database/factories/team.factory'
import { body, type Session } from '#tests/helpers'

/**
 * A montagem das specs de chave e partida.
 *
 * Dois caminhos, e cada spec usa o que a ação pede: o sorteio pela rota
 * (`draw`), quando o teste depende da chave inteira - fases, folga, avanço do
 * vencedor -, e a partida solta pela factory (`scheduledMatch`), quando basta
 * uma linha com os dois times.
 */

export async function createSport(client: ApiClient, admin: Session, minAthletes = 1) {
  const response = await client
    .post('/administrator/sports')
    .cookies(admin)
    .json({ name: 'Futsal', minAthletes, maxAthletes: 3 })

  response.assertStatus(201)

  return body(response)
}

/** Cria `total` turmas do 6º ao 9º, cada uma com um aluno inscrito na modalidade. */
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

/** Modalidade, `total` turmas inscritas e o sorteio, tudo pela rota. */
export async function drawnBracket(client: ApiClient, admin: Session, total: number) {
  const sport = await createSport(client, admin)
  const classroomIds = await enrolledClassrooms(client, admin, sport.id, total)
  const bracket = await draw(client, admin, sport.id)

  return { sport, classroomIds, bracket }
}

/** Lança 2 x 1 em toda partida da fase que já tem os dois times. */
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
 * Uma final avulsa com os dois times definidos e sem placar: a chave, as duas
 * turmas e a partida saem da factory.
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
