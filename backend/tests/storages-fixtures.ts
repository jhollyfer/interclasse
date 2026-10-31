import { randomUUID } from 'node:crypto'

import { DateTime } from 'luxon'
import { UPLOAD_STATUS } from '@interclasse/shared'

import Storage from '#models/storage'
import { PNG_HEAD } from '#tests/storages-unit-fixtures'

/**
 * A PNG body of the requested size, for the specs that really upload a file: the
 * `complete` checks the content against the declared type, and loose bytes would be
 * refused.
 */
export function pngBytes(size: number, fill = 66): Uint8Array {
  const bytes = new Uint8Array(size).fill(fill)
  bytes.set(PNG_HEAD)

  return bytes
}

/**
 * A row with the chosen metadata, for the listing tests.
 *
 * Separate from the `record(status)` above because that one fixes `originalName` and
 * `mimetype`, which are precisely the columns the search and filters cut by.
 * `filename` comes out random so the same bucket key does not repeat on two
 * rows.
 */
export function storageRow(attributes: Partial<Storage> = {}) {
  const filename = `${randomUUID()}.png`

  return Storage.create({
    filename,
    originalName: 'capa.png',
    mimetype: 'image/png',
    size: 1024,
    path: filename,
    status: UPLOAD_STATUS.UPLOADED,
    ...attributes,
  })
}

/** Whether the `storages` row still exists, so the spec checks the effect without importing the model. */
export async function storageExists(id: string): Promise<boolean> {
  return (await Storage.find(id)) !== null
}

/** Ages the row in the database: it is the age the cleanup command uses to decide. */
export async function ageStorage(id: string, hours: number): Promise<void> {
  await Storage.query()
    .where('id', id)
    .update({ created_at: DateTime.now().minus({ hours }).toSQL() })
}
