/**
 * Interseção achatada: `A & B` mostrado como um objeto só.
 *
 * O mapeamento sobre `keyof (A & B)` não muda o tipo, muda o que o editor
 * exibe no hover e o que uma mensagem de erro imprime - `{ a: string; b:
 * number }` em vez de `A & B`. É por isso que ele existe, e é por isso que o
 * índice das docs manda combinar tipos de objeto com ele em vez de com `&`.
 *
 * Não serve para classe: mapear as chaves de uma classe achata os métodos e
 * perde o tipo nominal.
 */
export type Merge<TBase, TOverride> = {
  [K in keyof (TBase & TOverride)]: (TBase & TOverride)[K]
}
