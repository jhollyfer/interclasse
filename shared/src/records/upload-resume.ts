import { z } from '../validator.js'

/**
 * What the upload remembers to survive a reload
 * (`lib/upload-resume.ts`): the resume entry plus the time it was stored, which is
 * the deadline bookkeeping.
 */
export const UploadResume = z.object({
  storageId: z.string(),
  /** Null for a single-part upload. */
  uploadId: z.string().nullable(),
  partSize: z.number(),
  savedAt: z.number(),
})

export type UploadResume = z.infer<typeof UploadResume>
