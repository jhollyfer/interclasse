import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { MATCH_PHASE } from '@interclasse/shared'

import Match from '#models/match'
import Team from '#models/team'
import { drawnBracket, scoreAll } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('brackets > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('chave com placar não se apaga; sem placar, sim', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { bracket } = await drawnBracket(client, admin, 4)
    await scoreAll(client, admin, bracket.id, MATCH_PHASE.SEMI)

    const recusa = await client.delete(`/administrator/brackets/${bracket.id}`).cookies(admin)
    recusa.assertStatus(409)
    assert.equal(body(recusa).code, 'BRACKET_HAS_RESULTS')

    const jogada = body(await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin))
    for (const match of jogada.matches) {
      if (match.status !== 'FINISHED') continue
      const desfaz = await client.delete(`/administrator/matches/${match.id}/score`).cookies(admin)
      desfaz.assertStatus(200)
    }

    const apaga = await client.delete(`/administrator/brackets/${bracket.id}`).cookies(admin)
    apaga.assertStatus(204)
  })

  test('apagar leva times e partidas e reabre as inscrições', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { sport, classroomIds, bracket } = await drawnBracket(client, admin, 2)

    const response = await client.delete(`/administrator/brackets/${bracket.id}`).cookies(admin)

    response.assertStatus(204)
    const detalhe = await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin)
    detalhe.assertStatus(404)
    assert.lengthOf(await Team.query().where('bracketId', bracket.id), 0)
    assert.lengthOf(await Match.query().where('bracketId', bracket.id), 0)

    // Sem a chave, a lista da turma continua aceitando mudança.
    const inscricao = await client.put('/advisor/enrollments').cookies(admin).json({
      classroomId: classroomIds[0],
      sportId: sport.id,
      studentIds: [],
      reason: 'Refazer o sorteio',
    })
    inscricao.assertStatus(200)
  })

  test('chave que não existe responde 404', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client.delete(`/administrator/brackets/${randomUUID()}`).cookies(admin)

    response.assertStatus(404)
    assert.equal(body(response).code, 'BRACKET_NOT_FOUND')
  })

  test('sem sessão é 401, e o conselheiro recebe 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)
    const url = `/administrator/brackets/${randomUUID()}`

    const anonimo = await client.delete(url)
    const conselheiro = await client.delete(url).cookies(advisor)

    anonimo.assertStatus(401)
    conselheiro.assertStatus(403)
    assert.equal(body(conselheiro).code, 'ACCESS_DENIED')
  })
})
