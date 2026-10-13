import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

/**
 * O layout de tabela salvo no `localStorage`. Não tem par no backend: é
 * preferência do navegador, e fica ao lado da tabela, fora de `src/validators/`
 * (que espelha só o que a API valida).
 *
 * Dado de fora entra como `unknown` (`typescript.md` §2): o que está gravado
 * sobrevive a deploy, e a forma de ontem não é garantia da de hoje.
 */
export const TableLayoutValidator = vine.create({
  columnVisibility: vine.record(vine.boolean()).optional(),
  columnOrder: vine.array(vine.string()).optional(),
  columnSizing: vine.record(vine.number()).optional(),
  columnPinning: vine
    .object({
      start: vine.array(vine.string()),
      end: vine.array(vine.string()),
    })
    .optional(),
})

export type TableLayoutPayload = Infer<typeof TableLayoutValidator>
