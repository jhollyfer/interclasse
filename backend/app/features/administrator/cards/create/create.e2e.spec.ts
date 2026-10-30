import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import MatchCard from '#models/match-card'
import { StudentFactory } from '#database/factories/student.factory'
import { matchWithTeams } from '#tests/classrooms-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('cards > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('lança o cartão no time do atleta e devolve com a partida', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { match, awayTeam, awayStudent } = await matchWithTeams()

    const response = await client
      .post('/administrator/cards')
      .cookies(session)
      .json({ matchId: match.id, studentId: awayStudent.id, color: 'YELLOW', note: 'Falta dura' })

    response.assertStatus(201)
    assert.equal(body(response).teamId, awayTeam.id)
    assert.equal(body(response).student.name, awayStudent.name)
    assert.equal(body(response).match.id, match.id)
    assert.lengthOf(await MatchCard.all(), 1)
  })

  test('atleta de turma que não joga a partida responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { match } = await matchWithTeams()
    const intruso = await StudentFactory.with('classroom').create()

    const response = await client
      .post('/administrator/cards')
      .cookies(session)
      .json({ matchId: match.id, studentId: intruso.id, color: 'RED' })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STUDENT_NOT_IN_MATCH')
    assert.lengthOf(await MatchCard.all(), 0)
  })

  test('partida inexistente responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { homeStudent } = await matchWithTeams()

    const response = await client
      .post('/administrator/cards')
      .cookies(session)
      .json({ matchId: randomUUID(), studentId: homeStudent.id, color: 'RED' })

    response.assertStatus(422)
    assert.equal(body(response).code, 'MATCH_NOT_FOUND')
  })

  test('conselheiro responde 403', async ({ client }) => {
    const session = await authenticateAsAdvisor(client)
    const { match, homeStudent } = await matchWithTeams()

    const response = await client
      .post('/administrator/cards')
      .cookies(session)
      .json({ matchId: match.id, studentId: homeStudent.id, color: 'RED' })

    response.assertStatus(403)
  })
})

test.group('administrator/cards/create > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: sem sessão', async ({ client }) => {
    const response = await client.post('/administrator/cards')

    response.assertStatus(401)
  })
})
