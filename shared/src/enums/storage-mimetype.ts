/**
 * Os tipos de arquivo que o upload aceita, e a extensão que cada um ganha na
 * chave do objeto.
 *
 * A extensão sai do `mimetype` declarado, e não do nome enviado: o nome é
 * rótulo de terceiro, e `foto.png` pode ser um pdf. `image/svg+xml` fica de
 * fora de propósito: SVG carrega `<script>`, e o navegador o executaria na
 * origem do storage.
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
 * Quantos bytes do início do objeto bastam para conferir o tipo: a maior
 * assinatura (WebP e WAV, `RIFF....WEBP`) acaba no byte 12.
 */
export const STORAGE_SIGNATURE_BYTES = 12
