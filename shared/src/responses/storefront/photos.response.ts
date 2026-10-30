import { z } from '../../validator.js'

/**
 * A foto do carrossel no site anônimo: a URL assinada e a legenda, sem quem
 * enviou nem o caminho no bucket.
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
