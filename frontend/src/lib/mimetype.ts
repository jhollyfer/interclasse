import { STORAGE_MIMETYPES } from '@interclasse/shared'
import type { StorageMimetype } from '@interclasse/shared'

/**
 * What the screen does with `@interclasse/shared`'s list of types: recognize
 * the chosen type and trim to the image ones, so the client refuses before
 * spending a request (the refusal that counts remains the server's).
 */

export function isStorageMimetype(value: string): value is StorageMimetype {
  return STORAGE_MIMETYPES.some((mimetype) => mimetype === value)
}

/**
 * The image subset, which becomes the native picker's `accept` and the refusal before
 * `POST /storages`. It comes from the whole list, and not from a hand-written
 * string: a manual copy would drift from it at the first backend change.
 */
export const IMAGE_MIMETYPES = STORAGE_MIMETYPES.filter((mimetype) =>
  mimetype.startsWith('image/'),
)
