import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { MATCH_STATUS } from '@interclasse/shared'

import { Stored } from '#tests/stored-fixtures'
import { drawnBracket, scheduledMatch } from '#tests/brackets-fixtures'
import { authenticateAsAdministrator, body, resetDatabase } from '#tests/http-fixtures'

test.group('storefront matches > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('the site lists the matches without a session', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    await drawnBracket(client, admin, 3)

    const response = await client.get('/storefront/matches').qs({ status: 'SCHEDULED' })

    response.assertStatus(200)
    // 3 classrooms: a real semifinal and the final, which already has the bye team
    // but not the opponent - so it does not enter the match table.
    assert.lengthOf(body(response).data, 1)
    assert.isString(body(response).data[0].homeTeam.classroom.name)
    // Advisor and representative accounts do not show on the anonymous site.
    assert.notProperty(body(response).data[0].homeTeam.classroom, 'advisorId')
    assert.notProperty(body(response).data[0].homeTeam.classroom, 'representativeId')
  })

  test('?classroomId lists only the classroom matches, as home or away', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const { classroomIds } = await drawnBracket(client, admin, 4)
    const [classroomId] = classroomIds
    if (!classroomId) throw new Error('fixture without a classroom')

    const response = await client.get('/storefront/matches').qs({ classroomId })

    response.assertStatus(200)
    // Bracket of 4: the classroom plays only its semifinal; the final has no teams yet.
    assert.lengthOf(body(response).data, 1)
    const [match] = body(response).data
    assert.include([match.homeTeam.classroom.id, match.awayTeam.classroom.id], classroomId)
  })

  test('?status=FINISHED lists the most recent result first', async ({ client, assert }) => {
    const older = await scheduledMatch()
    const recent = await scheduledMatch()
    // The schedule would put the scheduled one first; a result is read by its last update.
    older.match.merge({
      status: MATCH_STATUS.FINISHED,
      scheduledAt: DateTime.now().minus({ days: 2 }),
    })
    await older.match.save()
    recent.match.status = MATCH_STATUS.FINISHED
    await recent.match.save()
    // Through the query, not the model: `save()` would rewrite `updatedAt` with now,
    // and two writes in the same millisecond would leave the order to chance.
    await Stored.touchMatch(older.match.id, DateTime.now().minus({ hours: 1 }))

    const response = await client.get('/storefront/matches').qs({ status: MATCH_STATUS.FINISHED })

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((match: { id: string }) => match.id),
      [recent.match.id, older.match.id],
    )
  })

  test('without a status filter, the order is the schedule one', async ({ client, assert }) => {
    const noTime = await scheduledMatch()
    const scheduled = await scheduledMatch()
    scheduled.match.scheduledAt = DateTime.now().plus({ days: 1 })
    await scheduled.match.save()

    const response = await client.get('/storefront/matches')

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((match: { id: string }) => match.id),
      [scheduled.match.id, noTime.match.id],
    )
    assert.equal(body(response).data[0].bracket.sport.id, scheduled.bracket.sportId)
  })

  test('?status outside the list responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    // In the URL, not in `.qs()`: the Tuyau registry types the value by the closed list.
    const response = await client.get('/storefront/matches?status=ADIADO')

    response.assertStatus(422)
    assert.property(body(response).errors, 'status')
  })
})
