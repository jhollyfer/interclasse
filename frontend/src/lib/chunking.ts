/**
 * The slicing arithmetic, isolated from the DOM and the network.
 *
 * It lives here, and not inside the hook, because it is the part that fails silently: a
 * swapped byte boundary throws no exception - it saves a corrupted file that only
 * shows up when someone tries to open it. Isolated, it is testable
 * with numbers, without uploading any file.
 */

/** A part, and where it starts and ends inside the file. */
export type PartPlan = {
  partNumber: number
  start: number
  /** Exclusive, like `Blob.slice`'s `end`. */
  end: number
}

/**
 * A file's slicing plan.
 *
 * The parts are numbered from **1**, and not from zero, because that is what S3
 * requires - `PartNumber` zero is an error. The last part is the remainder, and can be
 * any size.
 *
 * An empty file still yields one part: a zero-byte `PUT` is a valid file, and
 * returning an empty plan would make the upload "finish" without ever having sent anything.
 */
export function planParts(size: number, partSize: number): Array<PartPlan> {
  const total = Math.max(1, Math.ceil(size / partSize))
  const parts: Array<PartPlan> = []

  for (let index = 0; index < total; index++) {
    const start = index * partSize

    parts.push({
      partNumber: index + 1,
      start,
      // The last part ends at the end of the file, and not at the multiple of the part
      // size - without the `min`, `Blob.slice` would ask beyond the end.
      end: Math.min(start + partSize, size),
    })
  }

  return parts
}

/**
 * What is still missing to send: the plan minus what the server said it already has.
 *
 * It is the heart of resuming. If 1499 parts went up, this returns 1500
 * onward - never the first.
 */
export function missingParts(
  plan: ReadonlyArray<PartPlan>,
  uploaded: ReadonlyArray<number>,
): Array<PartPlan> {
  const received = new Set(uploaded)

  return plan.filter((part) => !received.has(part.partNumber))
}
