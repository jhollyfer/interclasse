import { z } from '../../validator.js'

/**
 * O "Sobre" para o site anônimo: o recorte da configuração (`GET
 * /storefront/site`). Do regulamento sai só o que o botão de baixar precisa -
 * a URL assinada, o nome e o tamanho -, sem o caminho no bucket nem o id do
 * upload.
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

export type StorefrontSiteShowResponse = z.infer<typeof StorefrontSiteShowResponse>
