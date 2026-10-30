import { z } from '../validator.js'

/**
 * O que o upload lembra para sobreviver a um recarregamento
 * (`lib/upload-resume.ts`): a entrada de retomada mais a hora em que foi
 * gravada, que é a contabilidade do prazo.
 */
export const UploadResume = z.object({
  storageId: z.string(),
  /** Nulo em upload de parte única. */
  uploadId: z.string().nullable(),
  partSize: z.number(),
  savedAt: z.number(),
})

export type UploadResume = z.infer<typeof UploadResume>
