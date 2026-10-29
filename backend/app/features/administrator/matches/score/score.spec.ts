import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { BRACKET_STATUS, MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import Bracket from '#models/bracket'
import { MatchFactory } from '#database/factories/match.factory'
import { drawnBracket, scheduledMatch, scoreAll } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/helpers'

test.group('matches > score', (group) => {
  group.each.setup(() => resetDatabase())

  test('o placar encerra a partida e sai com os times e a chave', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket, home, match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: 3, awayScore: 1 })

    response.assertStatus(200)
    assert.equal(body(response).status, MATCH_STATUS.FINISHED)
    assert.equal(body(response).homeScore, 3)
    assert.equal(body(response).awayScore, 1)
    assert.equal(body(response).winnerTeamId, home.id)
    assert.isString(body(response).homeTeam.classroom.name)
    assert.equal(body(response).bracket.sport.id, bracket.sportId)
    // A partida é a final: a chave encerra junto.
    await bracket.refresh()
    assert.equal(bracket.status, BRACKET_STATUS.FINISHED)
  })

  test('do sorteio ao campeão: o vencedor avança sozinho', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await drawnBracket(client, admin, 4)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.SEMI)

    const antes = await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin)
    const final = body(antes).matches.find(
      (match: { phase: string }) => match.phase === MATCH_PHASE.FINAL,
    )
    assert.isString(final.homeTeamId)
    assert.isString(final.awayTeamId)

    // Empate exige quem venceu nos pênaltis.
    const semVencedor = await client
      .put(`/administrator/matches/${final.id}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 1 })
    semVencedor.assertStatus(422)
    assert.equal(body(semVencedor).code, 'MATCH_WINNER_REQUIRED')

    const penaltis = await client
      .put(`/administrator/matches/${final.id}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 1, winnerTeamId: final.awayTeamId })
    penaltis.assertStatus(200)

    const depois = await client.get(`/storefront/brackets/${bracket.id}`)
    assert.equal(body(depois).status, 'FINISHED')
    assert.equal(body(depois).championTeamId, final.awayTeamId)

    // Trocar o vencedor de uma semifinal depois da final jogada reescreveria a final.
    const semi = body(depois).matches.find(
      (match: { phase: string; winnerTeamId: string; homeTeamId: string }) =>
        match.phase === MATCH_PHASE.SEMI && match.winnerTeamId === match.homeTeamId,
    )
    const virada = await client
      .put(`/administrator/matches/${semi.id}/score`)
      .cookies(admin)
      .json({ homeScore: 0, awayScore: 5 })
    virada.assertStatus(409)
    assert.equal(body(virada).code, 'NEXT_MATCH_PLAYED')
  })

  test('corrigir o placar sem trocar o vencedor passa mesmo com a seguinte jogada', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await drawnBracket(client, admin, 4)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.SEMI)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.FINAL)
    const jogada = body(await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin))
    const semi = jogada.matches.find((match: { phase: string }) => match.phase === MATCH_PHASE.SEMI)

    // 2 x 1 vira 4 x 0: o mandante segue vencedor, a final não muda.
    const response = await client
      .put(`/administrator/matches/${semi.id}/score`)
      .cookies(admin)
      .json({ homeScore: 4, awayScore: 0 })

    response.assertStatus(200)
    assert.equal(body(response).homeScore, 4)
    assert.equal(body(response).winnerTeamId, semi.homeTeamId)
  })

  test('empate com vencedor de fora da partida responde 422', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: 2, awayScore: 2, winnerTeamId: randomUUID() })

    response.assertStatus(422)
    assert.equal(body(response).code, 'MATCH_WINNER_REQUIRED')
    assert.property(body(response).errors, 'winnerTeamId')
  })

  test('partida sem os dois times responde 409', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await scheduledMatch()
    const pendente = await MatchFactory.merge({
      bracketId: bracket.id,
      phase: MATCH_PHASE.SEMI,
    }).create()

    const response = await client
      .put(`/administrator/matches/${pendente.id}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 0 })

    response.assertStatus(409)
    assert.equal(body(response).code, 'MATCH_TEAMS_PENDING')
  })

  test('partida que não existe responde 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .put(`/administrator/matches/${randomUUID()}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 0 })

    response.assertStatus(404)
    assert.equal(body(response).code, 'MATCH_NOT_FOUND')
  })

  test('placar negativo ou fracionado responde 422 e não grava', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    const response = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: -1, awayScore: 1.5 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'homeScore')
    assert.property(body(response).errors, 'awayScore')
    await match.refresh()
    assert.equal(match.status, MATCH_STATUS.SCHEDULED)
    const bracket = await Bracket.findOrFail(match.bracketId)
    assert.equal(bracket.status, BRACKET_STATUS.KNOCKOUT)
  })

  test('sem sessão é 401, e o conselheiro recebe 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/matches/${randomUUID()}/score`
    const placar = { homeScore: 1, awayScore: 0 }

    const anonimo = await client.put(url).json(placar)
    const conselheiro = await client.put(url).cookies(advisor).json(placar)

    anonimo.assertStatus(401)
    conselheiro.assertStatus(403)
    assert.equal(body(conselheiro).code, 'ACCESS_DENIED')
  })
})
