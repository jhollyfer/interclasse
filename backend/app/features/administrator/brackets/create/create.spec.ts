import { test } from '@japa/runner'

import { CATEGORY, MATCH_PHASE } from '#core/entity'
import { createSport, draw, enrolledClassrooms } from '#tests/brackets-fixtures'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/helpers'

/**
 * O sorteio, por HTTP: turmas, alunos e inscrições pela rota, porque é delas
 * que a chave sai. Placar, desfazer placar, apagar a chave e o site têm a spec
 * da própria ação; a montagem comum está em `tests/brackets-fixtures.ts`.
 */

test.group('brackets > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('turma abaixo do mínimo não entra, e menos de duas turmas é 409', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin, 2)
    await enrolledClassrooms(client, admin, sport.id, 3)

    const response = await client
      .post('/administrator/brackets')
      .cookies(admin)
      .json({ sportId: sport.id, category: CATEGORY.F2 })

    response.assertStatus(409)
    assert.equal(body(response).code, 'NOT_ENOUGH_TEAMS')
  })

  test('com 3 turmas: uma de folga vai direto para a final', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    await enrolledClassrooms(client, admin, sport.id, 3)

    const bracket = await draw(client, admin, sport.id)
    const detail = await client.get(`/storefront/brackets/${bracket.id}`)
    const matches: Array<{ phase: string; homeTeamId: string | null; awayTeamId: string | null }> =
      body(detail).matches

    const semis = matches.filter((match) => match.phase === MATCH_PHASE.SEMI)
    const final = matches.find((match) => match.phase === MATCH_PHASE.FINAL)

    assert.equal(body(detail).status, 'KNOCKOUT')
    // Chave de 4 com uma folga: só uma semifinal de verdade.
    assert.lengthOf(semis, 1)
    // O time de folga já está na final, à espera do vencedor da semifinal.
    assert.isString(final?.homeTeamId)
    assert.isNull(final?.awayTeamId)
  })

  test('o sorteio trava as inscrições da modalidade na categoria', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    const [classroomId] = await enrolledClassrooms(client, admin, sport.id, 2)
    await draw(client, admin, sport.id)

    const response = await client
      .put('/advisor/enrollments')
      .cookies(admin)
      .json({ classroomId, sportId: sport.id, studentIds: [] })

    response.assertStatus(409)
    assert.equal(body(response).code, 'ENROLLMENT_LOCKED')
  })
})
