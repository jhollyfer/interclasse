import { test } from '@japa/runner'

import MatchCard from '#models/match-card'
import { matchWithTeams } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

test.group('cards > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('lista os cartões e filtra pela turma', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { match, home, homeTeam, awayTeam, homeStudent, awayStudent } = await matchWithTeams()
    await MatchCard.createMany([
      { matchId: match.id, teamId: homeTeam.id, studentId: homeStudent.id, color: 'YELLOW' },
      { matchId: match.id, teamId: awayTeam.id, studentId: awayStudent.id, color: 'RED' },
    ])

    const all = await client.get('/administrator/cards').cookies(session)
    const filtered = await client
      .get('/administrator/cards')
      .qs({ classroomId: home.id })
      .cookies(session)

    all.assertStatus(200)
    assert.equal(body(all).meta.total, 2)
    filtered.assertStatus(200)
    assert.equal(body(filtered).meta.total, 1)
    assert.equal(body(filtered).data[0].student.id, homeStudent.id)
    assert.equal(body(filtered).data[0].team.classroom.name, home.name)
  })
})

test.group('administrator/cards/paginate > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: sem sessão', async ({ client }) => {
    const response = await client.get('/administrator/cards')

    response.assertStatus(401)
  })

  test('403: conselheiro não alcança a rota da organização', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/cards').cookies(advisor)

    response.assertStatus(403)
  })
})
