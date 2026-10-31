import { z } from '../../validator.js'

/**
 * The carousel photo on the anonymous site: the signed URL and the caption, without
 * who uploaded it or the path in the bucket.
 */
export const StorefrontPhotoShowResponse = z.object({
  id: z.uuid(),
  caption: z.string().nullable(),
  url: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
})

export type StorefrontPhotoShowResponse = z.infer<
  typeof StorefrontPhotoShowResponse
>
