/**
 * O que o Lucid deixa em `$extras` e não coloca no JSON.
 *
 * Duas coisas caem ali: o resultado de `withCount`/`withAggregate` e as colunas
 * de pivô de uma relação N:N. As duas só aparecem na resposta com
 * `serializeExtras = true` no model - e aí aparecem **sempre**, com o nome cru
 * do banco (`products_count`, `pivot_role`), em toda leitura, inclusive nas que
 * não contam nem precarregam nada.
 *
 * A saída nativa é um `@computed`, que sai com o nome do contrato e **some
 * quando devolve `undefined`** (`serializeComputed` pula esses). É isso que faz
 * `productsCount` existir na listagem que roda `withCount` e não existir na
 * leitura de um item só, sem ninguém remontar objeto no use-case.
 *
 * Estas funções existem para o cálculo não ser copiado em cada getter: o
 * `Number()` é obrigatório porque o `COUNT` do Postgres volta como `bigint`, e
 * o driver o entrega em string.
 */

type Extras = Record<string, unknown>

/** Um agregado de `withCount`/`withAggregate`. Ausente vira `undefined`. */
export function aggregate(extras: Extras, alias: string): number | undefined {
  const value = extras[alias]

  if (value === undefined || value === null) return undefined

  return Number(value)
}

/**
 * Uma coluna de pivô numérica.
 *
 * `undefined` é "esta leitura não veio pela relação N:N", e some do JSON;
 * `null` é "veio, e a coluna está vazia" - proporção não declarada. A distinção
 * importa, e é por ela que não há um `?? null` genérico aqui.
 */
export function pivotNumber(extras: Extras, column: string): number | null | undefined {
  const value = extras[`pivot_${column}`]

  if (value === undefined) return undefined
  if (value === null) return null

  return Number(value)
}

/** Uma coluna de pivô textual, pela mesma regra de `pivotNumber`. */
export function pivotText(extras: Extras, column: string): string | null | undefined {
  const value = extras[`pivot_${column}`]

  if (value === undefined) return undefined
  if (typeof value === 'string') return value

  return null
}
