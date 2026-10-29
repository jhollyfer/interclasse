import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import Match from '#models/match'
import { MATCH_STATUS } from '#core/entity'
import { drawnBracket, scheduledMatch } from '#tests/brackets-fixtures'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'

test.group('storefront matches > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('o site lista os jogos sem sessão', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    await drawnBracket(client, admin, 3)

    const response = await client.get('/storefront/matches').qs({ status: 'SCHEDULED' })

    response.assertStatus(200)
    // 3 turmas: uma semifinal de verdade e a final, que já tem o time de folga
    // mas não o adversário - por isso não entra na tabela de jogos.
    assert.lengthOf(body(response).data, 1)
    assert.isString(body(response).data[0].homeTeam.classroom.name)
    // Conta de conselheiro e de representante não sai no site anônimo.
    assert.notProperty(body(response).data[0].homeTeam.classroom, 'advisorId')
    assert.notProperty(body(response).data[0].homeTeam.classroom, 'representativeId')
  })

  test('?classroomId lista só os jogos da turma, como mandante ou visitante', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { classroomIds } = await drawnBracket(client, admin, 4)
    const [classroomId] = classroomIds
    if (!classroomId) throw new Error('fixture sem turma')

    const response = await client.get('/storefront/matches').qs({ classroomId })

    response.assertStatus(200)
    // Chave de 4: a turma joga só a semifinal dela; a final ainda não tem times.
    assert.lengthOf(body(response).data, 1)
    const [match] = body(response).data
    assert.include([match.homeTeam.classroom.id, match.awayTeam.classroom.id], classroomId)
  })

  test('?status=FINISHED lista o resultado mais recente primeiro', async ({ client, assert }) => {
    const antigo = await scheduledMatch()
    const recente = await scheduledMatch()
    // A agenda poria o marcado antes; resultado se lê pela última atualização.
    antigo.match.merge({
      status: MATCH_STATUS.FINISHED,
      scheduledAt: DateTime.now().minus({ days: 2 }),
    })
    await antigo.match.save()
    recente.match.status = MATCH_STATUS.FINISHED
    await recente.match.save()
    // Pela query, e não pelo model: o `save()` regravaria `updatedAt` com agora,
    // e duas gravações no mesmo milissegundo deixariam a ordem ao acaso.
    await Match.query()
      .where('id', antigo.match.id)
      .update({ updatedAt: DateTime.now().minus({ hours: 1 }).toSQL() })

    const response = await client.get('/storefront/matches').qs({ status: MATCH_STATUS.FINISHED })

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((match: { id: string }) => match.id),
      [recente.match.id, antigo.match.id],
    )
  })

  test('sem filtro de status, a ordem é a da agenda', async ({ client, assert }) => {
    const semHorario = await scheduledMatch()
    const marcada = await scheduledMatch()
    marcada.match.scheduledAt = DateTime.now().plus({ days: 1 })
    await marcada.match.save()

    const response = await client.get('/storefront/matches')

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((match: { id: string }) => match.id),
      [marcada.match.id, semHorario.match.id],
    )
    assert.equal(body(response).data[0].bracket.sport.id, marcada.bracket.sportId)
  })

  test('?status fora da lista responde 422 apontando o campo', async ({ client, assert }) => {
    // Na URL, e não em `.qs()`: o registry do Tuyau tipa o valor pela lista fechada.
    const response = await client.get('/storefront/matches?status=ADIADO')

    response.assertStatus(422)
    assert.property(body(response).errors, 'status')
  })
})
