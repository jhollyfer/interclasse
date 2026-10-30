import { z } from '@interclasse/shared'

/**
 * O layout de tabela salvo no `localStorage`. Não tem par no backend: é
 * preferência do navegador, e fica ao lado da tabela, não no `shared/`
 * (que só tem o que a API valida).
 *
 * Dado de fora entra como `unknown` (`typescript.md` §2): o que está gravado
 * sobrevive a deploy, e a forma de ontem não é garantia da de hoje.
 */
export const TableLayoutValidator = z.object({
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnSizing: z.record(z.string(), z.number()).optional(),
  columnPinning: z
    .object({
      start: z.array(z.string()),
      end: z.array(z.string()),
    })
    .optional(),
})

export type TableLayoutPayload = z.infer<typeof TableLayoutValidator>
