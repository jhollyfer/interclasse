import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UPLOAD_STATUS } from '@interclasse/shared'

import { storageRow } from '#tests/storages-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  type ResponseBody,
} from '#tests/http-fixtures'

/**
 * The file as a neutral, shared record: it does not belong to the
 * form that submitted it, and ownership authorizes nothing. What rules is the state
 * (`PENDING` or `UPLOADED`) and the live reference.
 */

/** Opens an upload through the real endpoint and returns the envelope. */

/** Sends a part to the signed URL and returns the `ETag`. */

/** The whole path, from zero to `UPLOADED`, for a single-part file. */

/** A `storages` row with no binary at all: only the metadata matters here. */

/**
 * The panel file library: `GET /storages` and `GET /storages/:id`.
 *
 * `backend-old` served both on `/storage/paginate` and `/storage/:id`, and the
 * screens that consume them survived the migration. What is asserted here is what the
 * query does before paginating - the default order, the two filters and the scope of the
 * search - and that the detail also reaches the half-finished upload.
 */
test.group('storages > listagem', (group) => {
  group.each.setup(() => resetDatabase())

  test('the default order is from most recent to oldest', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const older = await storageRow({ originalName: 'antigo.png' })
    const recent = await storageRow({ originalName: 'recente.png' })

    // `createdAt` comes from `autoCreate` and the two rows are born in the same
    // millisecond: without separating them, the order would be the database's and the test would pass
    // with any `orderBy`.
    await older.merge({ createdAt: DateTime.now().minus({ days: 2 }) }).save()

    const response = await client.get('/storages').cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((item: ResponseBody) => item.id),
      [recent.id, older.id],
    )
    // Page 1 with 20 items is the default of every panel resource.
    assert.equal(body(response).meta.currentPage, 1)
    assert.equal(body(response).meta.perPage, 20)
  })

  test('?status narrows to the open upload', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await storageRow()
    const pending = await storageRow({ status: UPLOAD_STATUS.PENDING })

    const response = await client.get('/storages').qs({ status: 'PENDING' }).cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, pending.id)
  })

  test('?mimetype narrows to one type only', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    await storageRow()
    const pdf = await storageRow({ mimetype: 'application/pdf' })

    const response = await client
      .get('/storages')
      .qs({ mimetype: 'application/pdf' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, pdf.id)
  })

  test('?search does not escape the status filter', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const confirmed = await storageRow({ originalName: 'contrato.pdf' })
    // Matches the search by **mimetype**, not by original name, and is
    // `PENDING`: with the loose `OR` it would show up even with `?status=UPLOADED`,
    // because the `OR` cancels the previous `AND`. The term has to land on a column
    // after the first, otherwise the grouped `OR` and the loose one answer the same and the
    // test measures nothing.
    await storageRow({
      originalName: 'sem-o-termo-no-nome.png',
      mimetype: 'application/pdf',
      status: UPLOAD_STATUS.PENDING,
    })

    const response = await client
      .get('/storages')
      .qs({ search: 'pdf', status: 'UPLOADED' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 1)
    assert.equal(body(response).data[0].id, confirmed.id)
  })

  test('?sort outside the closed tuple responds 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // `path` is a `storages` column, but not a sort column: the value would go
    // straight into `orderBy` and compose SQL.
    //
    // The query goes in the URL itself, not in `.qs()`: the Tuyau registry types the
    // object by the closed tuple, and the invalid value this test exists to
    // send would not compile.
    const response = await client.get('/storages?sort=path').cookies(session)

    response.assertStatus(422)
    assert.property(body(response).errors, 'sort')
  })

  test('without a session responds 401', async ({ client }) => {
    const response = await client.get('/storages')

    response.assertStatus(401)
  })
})
