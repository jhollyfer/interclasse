import { test } from '@japa/runner'
import { CATEGORY } from '@interclasse/shared'

import { Stored } from '#tests/stored-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

/**
 * The games path from end to end, over HTTP: classrooms, students, enrollments,
 * draw, score, knockout and the site.
 *
 * A single file because the steps depend on one another - the draw needs
 * enrollment, the knockout needs a score -, and spreading them would repeat the whole
 * setup in each spec.
 */

/** Creates `total` classrooms from the 6th to the 9th grade, each with a student enrolled in the sport. */

test.group('games > classrooms', (group) => {
  group.each.setup(() => resetDatabase())

  test('the category comes from the year, and a repeated name is 409', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)

    const fifth = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '5º A', grade: 5 })
    const sixth = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '6º A', grade: 6 })
    const duplicate = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '6º A', grade: 6 })

    assert.equal(body(fifth).category, CATEGORY.F1)
    assert.equal(body(sixth).category, CATEGORY.F2)
    duplicate.assertStatus(409)
    assert.equal(body(duplicate).code, 'CLASSROOM_ALREADY_EXISTS')
  })

  test('advisor must have the advisor role', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { user } = await signInWithFactory(client, 'representative')

    const response = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '7º A', grade: 7, advisorId: user.id })

    response.assertStatus(422)
    assert.equal(body(response).code, 'ADVISOR_NOT_FOUND')
  })
})

test.group('administrator/classrooms/create > access and validation', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: without a session', async ({ client }) => {
    const response = await client.post('/administrator/classrooms')

    response.assertStatus(401)
  })

  test('403: advisor does not reach the organization route', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.post('/administrator/classrooms').cookies(advisor)

    response.assertStatus(403)
  })
})

test.group('administrator/classrooms/create > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('empty name and year outside 3rd to 9th respond 422 pointing at the fields, and nothing is saved', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '   ', grade: 1 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
    assert.property(body(response).errors, 'grade')
    assert.lengthOf(await Stored.classrooms(), 0)
  })
})
