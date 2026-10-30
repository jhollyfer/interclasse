import { test } from '@japa/runner'

import { MatchCardFactory } from '#database/factories/match-card.factory'
import { matchWithTeams } from '#tests/classrooms-fixtures'
import { body, resetDatabase, signInWithFactory } from '#tests/http-fixtures'

test.group('advisor cards > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('o conselheiro vê os cartões da própria turma', async ({ client, assert }) => {
    const { user, session } = await signInWithFactory(client)
    const { match, home, homeTeam, awayTeam, homeStudent, awayStudent } = await matchWithTeams()
    home.advisorId = user.id
    await home.save()
    await MatchCardFactory.merge([
      { matchId: match.id, teamId: homeTeam.id, studentId: homeStudent.id, color: 'RED' },
      { matchId: match.id, teamId: awayTeam.id, studentId: awayStudent.id, color: 'YELLOW' },
    ]).createMany(2)

    const response = await client
      .get('/advisor/cards')
      .qs({ classroomId: home.id })
      .cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).meta.total, 1)
    assert.equal(body(response).data[0].color, 'RED')
  })

  test('turma alheia responde 404', async ({ client, assert }) => {
    const { session } = await signInWithFactory(client)
    const { away } = await matchWithTeams()

    const response = await client
      .get('/advisor/cards')
      .qs({ classroomId: away.id })
      .cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })
})
