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

  test('only matches with both teams, and the scheduled ones before those without a time', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const noTime = await scheduledMatch()
    const scheduled = await scheduledMatch()
    scheduled.match.scheduledAt = DateTime.now().plus({ days: 1 })
    await scheduled.match.save()
    // Knockout still without an opponent: "to be defined x to be defined" does not enter.
    await MatchFactory.merge({
      bracketId: noTime.bracket.id,
      phase: MATCH_PHASE.SEMI,
      homeTeamId: noTime.home.id,
    }).create()

    const response = await client.get('/administrator/matches').cookies(admin)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((match: { id: string }) => match.id),
      [scheduled.match.id, noTime.match.id],
    )
    assert.equal(body(response).meta.total, 2)
  })

  test('each match comes out with the classrooms and the sport, without account ids', async ({
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

  test('?bracketId and ?status narrow the list', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const target = await scheduledMatch()
    const other = await scheduledMatch()
    other.match.status = MATCH_STATUS.FINISHED
    await other.match.save()

    const byBracket = await client
      .get('/administrator/matches')
      .qs({ bracketId: target.bracket.id })
      .cookies(admin)
    const byStatus = await client
      .get('/administrator/matches')
      .qs({ status: MATCH_STATUS.FINISHED })
      .cookies(admin)

    byBracket.assertStatus(200)
    byStatus.assertStatus(200)
    assert.lengthOf(body(byBracket).data, 1)
    assert.equal(body(byBracket).data[0].id, target.match.id)
    assert.lengthOf(body(byStatus).data, 1)
    assert.equal(body(byStatus).data[0].id, other.match.id)
  })

  test('?phase outside the list responds 422 pointing at the field', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    // In the URL, not in `.qs()`: the Tuyau registry types the value by the closed list.
    const response = await client.get('/administrator/matches?phase=OITAVAS').cookies(admin)

    response.assertStatus(422)
    assert.property(body(response).errors, 'phase')
  })

  test('without a session is 401, and the advisor gets 403', async ({ client, assert }) => {
    const advisor = await authenticateAsAdvisor(client)

    const anonymous = await client.get('/administrator/matches')
    const advisorSession = await client.get('/administrator/matches').cookies(advisor)

    anonymous.assertStatus(401)
    advisorSession.assertStatus(403)
    assert.equal(body(advisorSession).code, 'ACCESS_DENIED')
  })
})
