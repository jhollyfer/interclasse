/**
 * The file types the upload accepts, and the extension each one gets in the object
 * key.
 *
 * The extension comes from the declared `mimetype`, not from the sent name: the name is
 * a third-party label, and `foto.png` can be a pdf. `image/svg+xml` is left out on
 * purpose: SVG carries `<script>`, and the browser would run it in the storage
 * origin.
 */
export const STORAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
} as const

export type StorageMimetype = keyof typeof STORAGE_EXTENSIONS

export const STORAGE_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
] as const satisfies ReadonlyArray<StorageMimetype>

/**
 * How many bytes at the start of the object are enough to check the type: the
 * longest signature (WebP and WAV, `RIFF....WEBP`) ends at byte 12.
 */
export const STORAGE_SIGNATURE_BYTES = 12
