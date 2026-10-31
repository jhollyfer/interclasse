import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  resetDatabase,
} from '#tests/http-fixtures'

test.group('administrator/reports > export', (group) => {
  group.each.setup(() => resetDatabase())

  test('200: the CSV per classroom, with BOM, attachment and no cache', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    await ClassroomFactory.merge({ name: '3º Z', grade: 3, category: 'F1' }).create()

    const response = await client.get('/administrator/reports/csv').cookies(admin)

    response.assertStatus(200)
    assert.include(response.header('content-type'), 'text/csv')
    assert.include(response.header('content-disposition'), 'attachment')
    assert.equal(response.header('cache-control'), 'no-store')
    assert.include(response.text(), '3º Z')
    assert.include(response.text(), ';')
  })

  test('401: without a session', async ({ client }) => {
    const response = await client.get('/administrator/reports/csv')

    response.assertStatus(401)
  })

  test('403: advisor does not download the report', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.get('/administrator/reports/csv').cookies(advisor)

    response.assertStatus(403)
  })
})
