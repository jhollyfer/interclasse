import { z } from '../../validator.js'

/**
 * The "About" for the anonymous site: the slice of the configuration (`GET
 * /storefront/site`). Of the regulation only what the download button needs comes out -
 * the signed URL, the name and the size -, without the path in the bucket or the
 * upload id.
 */
export const StorefrontSiteShowResponse = z.object({
  about: z.string().nullable(),
  organizer: z.string().nullable(),
  firstEditionYear: z.number().int().nullable(),
  edition: z.number().int().nullable(),
  schoolInstagram: z.string().nullable(),
  developerInstagram: z.string().nullable(),
  regulation: z
    .object({ url: z.string(), originalName: z.string(), size: z.number() })
    .nullable(),
})

export type StorefrontSiteShowResponse = z.infer<
  typeof StorefrontSiteShowResponse
>
