import { z } from '../validator.js'

/**
 * O layout de tabela que o navegador guarda (`lib/local-store.ts`). Não tem
 * par no backend, por isso não é `*.validator.ts` (sem o par VineJS que o
 * `pattern:check` cobra): é preferência de tela, não payload de API.
 *
 * Dado de fora entra como `unknown` (`typescript.md` §2): o que está gravado
 * sobrevive a deploy, e a forma de ontem não é garantia da de hoje.
 */
export const TableLayout = z.object({
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

export type TableLayout = z.infer<typeof TableLayout>
