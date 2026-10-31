import { test } from '@japa/runner'
import { CATEGORY, MATCH_PHASE } from '@interclasse/shared'

import { Stored } from '#tests/stored-fixtures'
import { createSport, draw, enrolledClassrooms } from '#tests/brackets-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

/**
 * The draw, over HTTP: classrooms, students and enrollments through the route, because the bracket
 * comes out of them. Score, undoing a score, deleting the bracket and the site have a spec
 * of their own action; the common setup is in `tests/brackets-fixtures.ts`.
 */

test.group('brackets > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('classroom below the minimum does not enter, and fewer than two classrooms is 409', async ({
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

  test('with 3 classrooms: the one with a bye goes straight to the final', async ({
    client,
    assert,
  }) => {
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
    // Bracket of 4 with one bye: only one real semifinal.
    assert.lengthOf(semis, 1)
    // The bye team is already in the final, waiting for the semifinal winner.
    assert.isString(final?.homeTeamId)
    assert.isNull(final?.awayTeamId)
  })

  test('after the draw the advisor list stays editable, with a reason', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    const [classroomId] = await enrolledClassrooms(client, admin, sport.id, 2)
    await draw(client, admin, sport.id)

    const response = await client.put('/advisor/enrollments').cookies(admin).json({
      classroomId,
      sportId: sport.id,
      studentIds: [],
      reason: 'Atleta machucado',
    })

    response.assertStatus(200)
    assert.isTrue(body(response).sports[0].drawn)
    assert.isFalse(body(response).sports[0].locked)
  })

  test('drawing again the same sport and category returns the already drawn bracket', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    await enrolledClassrooms(client, admin, sport.id, 3)

    // The first request committed, but the browser gave up before the response: the
    // resend must lead to the same bracket, not to an error nor to a new draw.
    const first = await draw(client, admin, sport.id)
    const again = await client
      .post('/administrator/brackets')
      .cookies(admin)
      .json({ sportId: sport.id, category: CATEGORY.F2 })

    again.assertStatus(200)
    assert.equal(body(again).id, first.id)

    const list = await client.get('/administrator/brackets').cookies(admin)
    assert.lengthOf(body(list).data, 1)
  })
})

test.group('administrator/brackets/create > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.post('/administrator/brackets')

    response.assertStatus(401)
  })

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.post('/administrator/brackets').cookies(advisor)

    response.assertStatus(403)
  })
})

test.group('administrator/brackets/create > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('malformed sport and category outside the list respond 422, and nothing is drawn', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/brackets')
      .cookies(admin)
      .json({ sportId: 'x', category: 'F9' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'sportId')
    assert.property(body(response).errors, 'category')
    assert.lengthOf(await Stored.brackets(), 0)
  })
})
