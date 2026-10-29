/**
 * Combina dois tipos de objeto com **override**: a chave de `TOverride`
 * substitui a de `TBase`, em vez de intersectar com ela.
 *
 * Não é o `Merge` de `@interclasse/shared`, que junta com `&` e serve ao
 * backend. Aqui a troca de chave é o ponto: props de componente
 * (`ReactNode` no lugar de `string`), `invalidate` de um hook que estreita o
 * da base, payload com o `id` do caminho. Com `&`, a mesma chave vira a
 * interseção dos dois tipos (`ReactNode & string` vira `string`) e o
 * componente deixa de aceitar o que declarou.
 *
 * Não serve para classe: mapear as chaves de uma classe achata os métodos e
 * perde o tipo nominal.
 */
export type Merge<TBase, TOverride> = {
  [K in keyof (Omit<TBase, keyof TOverride> & TOverride)]: (Omit<
    TBase,
    keyof TOverride
  > &
    TOverride)[K]
}
