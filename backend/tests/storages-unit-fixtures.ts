import type { Either } from '@interclasse/shared'

import { Storage } from '#domain/storage/storage.entity'
import { StorageMemoryRepository } from '#repositories/storage/storage.memory.repository'
import { StorageFake } from '#services/storage/storage.fake'
import { MultipartFake } from '#services/multipart/multipart.fake'

export const FILE_ID = '8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d'

/** A `PENDING` file of 1 KiB; a present `uploadId` means multipart. */
export function pendingFile(overrides: { id?: string; uploadId?: string | null } = {}): Storage {
  return Storage.open({
    id: overrides.id ?? FILE_ID,
    key: 'capa.png',
    originalName: 'capa.png',
    mimetype: 'image/png',
    size: 1024,
    uploadId: overrides.uploadId ?? null,
    partSize: 10 * 1024 * 1024,
    now: new Date('2026-10-29T12:00:00Z'),
  })
}

/** An already confirmed file. */
/** The start of a PNG: the content the `image/png` type requires on `complete`. */
export const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

export function uploadedFile(id = FILE_ID): Storage {
  const file = pendingFile({ id })
  file.complete({ contentLength: 1024, head: PNG_HEAD }, new Date('2026-10-29T12:05:00Z'))

  return file
}

/** The three external I/O collaborators of the file use cases, in memory. */
export function storageDoubles() {
  return {
    storages: new StorageMemoryRepository(),
    bucket: new StorageFake(),
    multipart: new MultipartFake(),
  }
}

/** The right side of the result; a `left` in the arrangement or the assertion fails the test. */
export function rightOf<L, R>(result: Either<L, R>): R {
  if (result.isLeft()) throw new Error(`esperava right, veio left: ${JSON.stringify(result.value)}`)

  return result.value
}
