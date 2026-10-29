import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import { drawnBracket, scheduledMatch, scoreAll } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('matches > unscore', (group) => {
  group.each.setup(() => resetDatabase())

  test('placar errado se desfaz, e a final desfeita reabre a chave', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await drawnBracket(client, admin, 4)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.SEMI)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.FINAL)

    const jogada = body(await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin))
    const semi = jogada.matches.find((match: { phase: string }) => match.phase === MATCH_PHASE.SEMI)
    const final = jogada.matches.find(
      (match: { phase: string }) => match.phase === MATCH_PHASE.FINAL,
    )

    // A semifinal não sai enquanto a final, que depende dela, tem placar.
    const cedo = await client.delete(`/administrator/matches/${semi.id}/score`).cookies(admin)
    cedo.assertStatus(409)
    assert.equal(body(cedo).code, 'NEXT_MATCH_PLAYED')

    const desfazFinal = await client
      .delete(`/administrator/matches/${final.id}/score`)
      .cookies(admin)
    desfazFinal.assertStatus(200)
    assert.equal(body(desfazFinal).status, 'SCHEDULED')

    const desfazSemi = await client.delete(`/administrator/matches/${semi.id}/score`).cookies(admin)
    desfazSemi.assertStatus(200)

    const depois = body(await client.get(`/storefront/brackets/${bracket.id}`))
    const finalDepois = depois.matches.find(
      (match: { phase: string }) => match.phase === MATCH_PHASE.FINAL,
    )
    assert.equal(depois.status, 'KNOCKOUT')
    assert.isNull(depois.championTeamId)
    // O vencedor da semifinal desfeita saiu da vaga dele na final.
    assert.isTrue(finalDepois.homeTeamId === null || finalDepois.awayTeamId === null)

    const deNovo = await client.delete(`/administrator/matches/${semi.id}/score`).cookies(admin)
    deNovo.assertStatus(409)
    assert.equal(body(deNovo).code, 'MATCH_NOT_PLAYED')
  })

  test('a partida volta sem placar e sai com os times e a chave', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket, match } = await scheduledMatch()
    const placar = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: 2, awayScore: 0 })
    placar.assertStatus(200)

    const response = await client.delete(`/administrator/matches/${match.id}/score`).cookies(admin)

    response.assertStatus(200)
    assert.equal(body(response).status, MATCH_STATUS.SCHEDULED)
    assert.isNull(body(response).homeScore)
    assert.isNull(body(response).awayScore)
    assert.isNull(body(response).winnerTeamId)
    assert.isString(body(response).awayTeam.classroom.name)
    assert.equal(body(response).bracket.sport.id, bracket.sportId)
  })

  test('partida sem placar responde 409', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { match } = await scheduledMatch()

    const response = await client.delete(`/administrator/matches/${match.id}/score`).cookies(admin)

    response.assertStatus(409)
    assert.equal(body(response).code, 'MATCH_NOT_PLAYED')
  })

  test('partida que não existe responde 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .delete(`/administrator/matches/${randomUUID()}/score`)
      .cookies(admin)

    response.assertStatus(404)
    assert.equal(body(response).code, 'MATCH_NOT_FOUND')
  })

  test('sem sessão é 401, e o conselheiro recebe 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/matches/${randomUUID()}/score`

    const anonimo = await client.delete(url)
    const conselheiro = await client.delete(url).cookies(advisor)

    anonimo.assertStatus(401)
    conselheiro.assertStatus(403)
    assert.equal(body(conselheiro).code, 'ACCESS_DENIED')
  })
})
