import { randomUUID } from 'node:crypto'

import {
  UPLOAD_STATUS,
  USER_ROLE,
  type AdministratorPhotoShowResponse,
  type UserRole,
} from '@interclasse/shared'

import { PhotoMemoryRepository } from '#repositories/photo/photo.memory.repository'

type StorageRow = AdministratorPhotoShowResponse['storage']

/** O arquivo do arranjo do repositório em memória: enviado, não arquivado. */
export function memoryStorage(overrides: Partial<StorageRow> = {}): StorageRow {
  return {
    id: randomUUID(),
    filename: 'foto.png',
    originalName: 'foto.png',
    mimetype: 'image/png',
    size: 1024,
    path: 'foto.png',
    status: UPLOAD_STATUS.UPLOADED,
    url: 'http://bucket/foto.png',
    createdAt: null,
    updatedAt: null,
    deletedAt: null,
    ...overrides,
  }
}

/** A conta de quem envia, no arranjo do repositório em memória. */
export function memoryAuthor(role: UserRole = USER_ROLE.ADVISOR) {
  return { id: randomUUID(), name: 'Ana', email: 'ana@mail.com', role }
}

/** O repositório em memória já com o arquivo e quem envia. */
export function memoryPhotos(storage: StorageRow, author: ReturnType<typeof memoryAuthor>) {
  return new PhotoMemoryRepository().withStorage(storage).withAuthor(author)
}
