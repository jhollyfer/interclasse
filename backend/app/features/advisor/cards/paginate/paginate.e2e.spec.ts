import { test } from '@japa/runner'

import { signInAsRepresentativeOfClassroom } from '#tests/classrooms-fixtures'
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

test.group('advisor/cards/paginate > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('sem sessão responde 401, e o representante responde 403', async ({ client }) => {
    const { session } = await signInAsRepresentativeOfClassroom(client)

    const anonymous = await client.get('/advisor/cards')
    const forbidden = await client.get('/advisor/cards').cookies(session)

    anonymous.assertStatus(401)
    forbidden.assertStatus(403)
  })

  test('sem a turma, ou com a turma malformada, responde 422 apontando o campo', async ({
    client,
    assert,
  }) => {
    const { session } = await signInWithFactory(client)

    const missing = await client.get('/advisor/cards').cookies(session)
    const malformed = await client.get('/advisor/cards').qs({ classroomId: 'x' }).cookies(session)

    missing.assertStatus(422)
    malformed.assertStatus(422)
    assert.property(body(missing).errors, 'classroomId')
    assert.property(body(malformed).errors, 'classroomId')
  })
})
