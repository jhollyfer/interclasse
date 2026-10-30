import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import { MatchFactory } from '#database/factories/match.factory'
import { scheduledMatch } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('matches > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('só partida com os dois times, e as marcadas antes das sem horário', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const semHorario = await scheduledMatch()
    const marcada = await scheduledMatch()
    marcada.match.scheduledAt = DateTime.now().plus({ days: 1 })
    await marcada.match.save()
    // Mata-mata ainda sem adversário: "a definir x a definir" não entra.
    await MatchFactory.merge({
      bracketId: semHorario.bracket.id,
      phase: MATCH_PHASE.SEMI,
      homeTeamId: semHorario.home.id,
    }).create()

    const response = await client.get('/administrator/matches').cookies(admin)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((match: { id: string }) => match.id),
      [marcada.match.id, semHorario.match.id],
    )
    assert.equal(body(response).meta.total, 2)
  })

  test('cada partida sai com as turmas e a modalidade, sem ids de conta', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket, home } = await scheduledMatch()

    const response = await client.get('/administrator/matches').cookies(admin)

    response.assertStatus(200)
    const [match] = body(response).data
    assert.equal(match.homeTeam.id, home.id)
    assert.isString(match.homeTeam.classroom.name)
    assert.notProperty(match.homeTeam.classroom, 'advisorId')
    assert.notProperty(match.awayTeam.classroom, 'representativeId')
    assert.equal(match.bracket.sport.id, bracket.sportId)
  })

  test('?bracketId e ?status recortam a lista', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const alvo = await scheduledMatch()
    const outra = await scheduledMatch()
    outra.match.status = MATCH_STATUS.FINISHED
    await outra.match.save()

    const porChave = await client
      .get('/administrator/matches')
      .qs({ bracketId: alvo.bracket.id })
      .cookies(admin)
    const porStatus = await client
      .get('/administrator/matches')
      .qs({ status: MATCH_STATUS.FINISHED })
      .cookies(admin)

    porChave.assertStatus(200)
    porStatus.assertStatus(200)
    assert.lengthOf(body(porChave).data, 1)
    assert.equal(body(porChave).data[0].id, alvo.match.id)
    assert.lengthOf(body(porStatus).data, 1)
    assert.equal(body(porStatus).data[0].id, outra.match.id)
  })

  test('?phase fora da lista responde 422 apontando o campo', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    // Na URL, e não em `.qs()`: o registry do Tuyau tipa o valor pela lista fechada.
    const response = await client.get('/administrator/matches?phase=OITAVAS').cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'phase')
  })

  test('sem sessão é 401, e o conselheiro recebe 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)

    const anonimo = await client.get('/administrator/matches')
    const conselheiro = await client.get('/administrator/matches').cookies(advisor)

    anonimo.assertStatus(401)
    conselheiro.assertStatus(403)
    assert.equal(body(conselheiro).code, 'ACCESS_DENIED')
  })
})
