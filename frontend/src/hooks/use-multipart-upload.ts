import {
  StoragesFileShowResponse,
  StoragesFileUploadResponse,
} from '@interclasse/shared'

import { request, HTTPError } from '#/integrations/tanstack-query/http'
import { missingParts, planParts } from '#/lib/chunking'
import type { PartPlan } from '#/lib/chunking'
import { isStorageMimetype } from '#/lib/mimetype'
import { clearResume, readResume, writeResume } from '#/lib/upload-resume'
import { putPart } from '#/lib/upload-transport'
import { m } from '#/paraglide/messages'

/**
 * A file upload, start to finish, on the client side.
 *
 * Three steps, because the binary does not go through the API: `POST /storages`
 * opens it and returns signed URLs, the browser sends each part straight to the
 * bucket, and `POST /storages/:id/complete` confirms. That is what allows large
 * files - an HTTP body of hundreds of megabytes hits the proxy limit before
 * reaching the application - and what allows resuming.
 *
 * Resuming has two halves, and both must exist for it to be worth anything. A
 * network drop is solved by `GET /storages/:id/parts`, which says what the bucket
 * already has. A page reload is solved by `localStorage`, which is where the
 * `storageId` survives - without it the upload would stay open on the server,
 * invisible, and the user would restart from zero a file that is almost
 * entirely there.
 */

export type MultipartUploadOptions = {
  /**
   * How many parts upload at the same time.
   *
   * Three because the bottleneck is the upload bandwidth, which is shared: more
   * connections do not increase it, they only split the same bandwidth into more
   * pieces and make each part take longer to finish - and a part that does not
   * finish is a part the resume will resend in full.
   */
  concurrency?: number
}

export type UploadFile = (
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
) => Promise<StoragesFileShowResponse>

export function useMultipartUpload({
  concurrency = 3,
}: MultipartUploadOptions = {}): { upload: UploadFile } {
  async function upload(
    file: File,
    onProgress: (percent: number) => void,
    signal: AbortSignal,
  ): Promise<StoragesFileShowResponse> {
    const mimetype = file.type

    if (!isStorageMimetype(mimetype)) {
      throw new Error(
        m.upload_error_type({
          type: mimetype || m.upload_unknown_type(),
        }),
      )
    }

    const plan = await open(file, mimetype)

    // Already confirmed when we found the upload again: nothing to send.
    if (plan.storage.status === 'UPLOADED') {
      clearResume(file)
      onProgress(100)

      // The plan brings the file without the derived `url`; the record with it
      // comes from `GET /storages/:id`.
      return request(
        '/storages/'.concat(plan.storage.id),
        StoragesFileShowResponse,
        { signal },
      )
    }

    writeResume(file, {
      storageId: plan.storage.id,
      uploadId: plan.uploadId,
      partSize: plan.partSize,
    })

    const etags = await send(file, plan, onProgress, signal, concurrency)
    const storage = await complete(plan.storage.id, plan.uploadId, etags)

    clearResume(file)

    return storage
  }

  return { upload }
}

/**
 * The upload plan: the one of a resumed upload, when there is one, and a new
 * one when there is not.
 *
 * The resumed one may have died on the other side - cancelled in another tab,
 * swept for abandonment -, and a `404` here is not an error: it is just an
 * upload that no longer exists, and the right move is to open another.
 */
async function open(
  file: File,
  mimetype: string,
): Promise<StoragesFileUploadResponse> {
  const saved = readResume(file)

  if (saved) {
    try {
      return await request(
        `/storages/${saved.storageId}/parts`,
        StoragesFileUploadResponse,
      )
    } catch (error) {
      if (!(error instanceof HTTPError) || error.status !== 404) throw error

      clearResume(file)
    }
  }

  return request('/storages', StoragesFileUploadResponse, {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      mimetype,
      size: file.size,
    }),
  })
}

/**
 * The piece of the file that goes in a `PUT`. The whole-file URL (without
 * `uploadId`) signs the `Content-Type`, and XHR only sends it if the `Blob` has
 * a type; the multipart part signs no type, and sending one would be a header
 * outside the signature, which S3 refuses.
 */
function sliceFor(file: File, part: PartPlan, uploadId: string | null): Blob {
  if (uploadId === null) return file.slice(part.start, part.end, file.type)

  return file.slice(part.start, part.end)
}

/**
 * Sends what is missing and returns each part's `ETag`, including the ones that
 * were already there - the confirmation needs the whole list, not only what
 * went up in this session.
 *
 * The outer loop exists because of the batch: a large file does not get all the
 * URLs at once, so when this batch's run out it asks for the next one on the
 * same endpoint as the resume.
 */
async function send(
  file: File,
  initial: StoragesFileUploadResponse,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
  concurrency: number,
): Promise<Array<{ partNumber: number; etag: string }>> {
  const plan = planParts(file.size, initial.partSize)
  const etags = new Map<number, string>()
  const progress = new Map<number, number>()

  function report() {
    let loaded = 0
    for (const bytes of progress.values()) loaded += bytes

    // A zero-byte file has no way to yield a fraction: it is already whole.
    if (file.size === 0) {
      onProgress(100)
      return
    }

    onProgress(Math.min(100, Math.round((loaded / file.size) * 100)))
  }

  let batch = initial

  for (const part of batch.uploaded) {
    etags.set(part.partNumber, part.etag)
    progress.set(part.partNumber, part.size)
  }

  report()

  while (etags.size < plan.length) {
    const pending = missingParts(plan, [...etags.keys()])
    const urls = new Map(batch.parts.map((part) => [part.partNumber, part.url]))
    const ready = pending.filter((part) => urls.has(part.partNumber))

    // The batch ended and a part is still missing: ask for the next one, which comes with
    // freshly signed URLs - the old ones may have expired.
    if (ready.length === 0) {
      batch = await request(
        `/storages/${initial.storage.id}/parts`,
        StoragesFileUploadResponse,
      )

      for (const part of batch.uploaded) {
        etags.set(part.partNumber, part.etag)
        progress.set(part.partNumber, part.size)
      }

      // The server gave neither a new URL nor a new part: insisting would be an endless loop.
      if (batch.parts.length === 0 && etags.size < plan.length) {
        throw new Error(m.upload_error_missing_urls())
      }

      continue
    }

    await pool(ready, concurrency, async (part) => {
      const url = urls.get(part.partNumber)

      if (!url) return

      // The backend signs the part's `Content-Length`: the body must be exactly
      // the planned size (`Blob.slice` of `[start, end)`). The browser sends the
      // header on its own from the `Blob`, and a part of any other size would
      // come back `403` from the bucket without saying why.
      const blob = sliceFor(file, part, initial.uploadId)

      if (blob.size !== part.end - part.start) {
        throw new Error(m.upload_error_part_size())
      }

      const etag = await putPart(url, blob, {
        signal,
        onProgress: (loaded) => {
          progress.set(part.partNumber, loaded)
          report()
        },
      })

      etags.set(part.partNumber, etag)
      progress.set(part.partNumber, part.end - part.start)
      report()
    })
  }

  return [...etags.entries()]
    .map(([partNumber, etag]) => ({ partNumber, etag }))
    .sort((a, b) => a.partNumber - b.partNumber)
}

/**
 * Closes the upload. The parts only go in the body when there was a multipart -
 * the simple `PUT` has no part to confirm.
 */
async function complete(
  storageId: string,
  uploadId: string | null,
  parts: ReadonlyArray<{ partNumber: number; etag: string }>,
): Promise<StoragesFileShowResponse> {
  const body: {
    parts?: ReadonlyArray<{ partNumber: number; etag: string }>
  } = {}

  if (uploadId) body.parts = parts

  return request(`/storages/${storageId}/complete`, StoragesFileShowResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Runs the tasks with a cap on how many run at once.
 *
 * Workers pulling from a shared queue, and not fixed-size batches: with batches,
 * the whole batch waits for the slowest part before the next one starts, and on
 * an uneven network that is most of the time spent idle.
 */
async function pool<TItem>(
  items: ReadonlyArray<TItem>,
  limit: number,
  run: (item: TItem) => Promise<void>,
): Promise<void> {
  // A single shared iterator: each `next()` hands the item to one
  // worker and no other sees it again.
  const queue = items.values()

  async function worker() {
    for (const item of queue) {
      await run(item)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
}
