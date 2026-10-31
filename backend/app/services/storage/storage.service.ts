import { randomUUID } from 'node:crypto'

import drive from '@adonisjs/drive/services/main'
import {
  STORAGE_EXTENSIONS,
  STORAGE_SIGNATURE_BYTES,
  type StorageMimetype,
} from '@interclasse/shared'

import {
  StorageContract,
  type StorageDownload,
  type StorageMetadata,
} from '#services/storage/storage.contract'
import { URL_TTL } from '#config/drive'

/**
 * Everything involving the bucket: the key under which the file lives, what the
 * bucket knows about it, the signed URLs and how the binary leaves the scene. The row
 * in `storages` and whoever references it belong to the `StorageRepository`.
 *
 * The binary does **not** pass through here: it goes from the browser straight to the
 * bucket by signed URL. What crosses this layer is metadata.
 */
export default class StorageService extends StorageContract {
  /**
   * The key under which the object will live in the bucket.
   *
   * A uuid plus the extension of the declared type. The name the user sent stays
   * only in `originalName`, as a label, and **never** becomes a path: it is
   * third-party text, and a path built from third-party text is how one writes
   * over somebody else's file.
   *
   * The extension comes from the `mimetype` and not from the sent name because the name is not
   * a trustworthy source - `foto.png` can be a pdf. The `mimetype` is the same value
   * the URL is signed with, so what the bucket accepts and what the key says
   * cannot diverge.
   */
  key(mimetype: StorageMimetype): string {
    return `${randomUUID()}.${STORAGE_EXTENSIONS[mimetype]}`
  }

  /**
   * What the bucket knows about the object: size, type, `ETag`.
   *
   * It is with this that the upload confirmation checks what **actually** went up
   * against what the client declared when asking for the URLs.
   */
  async metadata(path: string): Promise<StorageMetadata> {
    return drive.use().getMetaData(path)
  }

  /**
   * The first bytes of the object: reads the start of the stream and closes it, without downloading the
   * rest of the file.
   */
  async head(path: string): Promise<Uint8Array> {
    const stream = await drive.use().getStream(path)
    const chunks: Buffer[] = []
    let read = 0

    try {
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
        read += chunk.length

        if (read >= STORAGE_SIGNATURE_BYTES) break
      }
    } finally {
      stream.destroy()
    }

    return Buffer.concat(chunks).subarray(0, STORAGE_SIGNATURE_BYTES)
  }

  /**
   * The signed read URL, with a deadline: the disk is private, so no
   * record address authorizes anything on its own. It costs no network: FlyDrive signs through
   * `@aws-sdk/s3-request-presigner`, which computes SigV4 locally. It expires at
   * `URL_TTL`, and whoever keeps it gets 403 after that.
   */
  async signedUrl(path: string): Promise<string> {
    return drive.use().getSignedUrl(path, { expiresIn: URL_TTL })
  }

  /** Deletes the binary from the bucket. */
  async discard(path: string): Promise<void> {
    await drive.use().delete(path)
  }

  /**
   * A temporary URL that delivers the file with the original name.
   *
   * The `Content-Disposition` travels signed inside the URL itself, and it is the bucket
   * that returns it on download - which is why the binary does not need to cross this
   * application just to gain a header - if it crossed, each download would occupy
   * the application for the duration of the transfer.
   *
   * It expires in minutes because it is the address of an action, not of a resource: whoever
   * wants the file again asks for another.
   */
  async signedDownload(file: StorageDownload): Promise<string> {
    return drive.use().getSignedUrl(file.path, {
      expiresIn: '5 minutes',
      contentType: file.mimetype,
      contentDisposition: this.contentDisposition(file.originalName),
    })
  }

  /**
   * The `Content-Disposition` header of a download, with the original name.
   *
   * Two names in the same header because RFC 6266 asks for both: `filename=` only
   * carries ASCII and is what an old browser reads, and `filename*=UTF-8''` is what
   * preserves accents and cedillas. Sending only the second makes the file arrive with the
   * wrong name for whoever does not understand it; sending only the first loses the accent for
   * everyone.
   *
   * The ASCII fallback decomposes the accent and drops the diacritic (`ó` -> `o`) instead
   * of going through a slug normalization: a slug would swap the extension dot
   * for a hyphen, and `relatorio-2026-pdf` opens in no program.
   * Quotes and slash become `_` because they would escape the quoted header value.
   */
  contentDisposition(originalName: string): string {
    const ascii = originalName
      .normalize('NFD')
      // The diacritics NFD separated from the base letter.
      .replace(/[\u0300-\u036f]/g, '')
      // What is left outside printable ASCII, plus quotes and slash, which
      // would escape the quoted header value.
      .replace(/["\\]|[^\u0020-\u007e]/g, '_')

    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
  }
}
