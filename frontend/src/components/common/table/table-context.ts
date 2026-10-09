import * as React from 'react'

import type { ListSearch } from '#/lib/list-search'

/**
 * O que toda a listagem compartilha - e nada além.
 *
 * **A instância da tabela não está aqui de propósito.** Um `React.Context` não
 * carrega o genérico de quem o provê, e a instância do TanStack recebe `TRow`
 * em posição de parâmetro em `options`, `getRowId`, `Column.accessorFn` e
 * afins: sob `strictFunctionTypes`, `TableInstance<Testimonial>` deixa de ser um
 * `TableInstance<RowData>`. Guardá-la aqui custaria um `as` ou um `any` e
 * apagaria o tipo do registro em toda a árvore. Ela vai por prop, de pai para
 * filho, nos três subcomponentes que a leem - e `row.original` segue tipado.
 *
 * O que sobra é o que não tem genérico nenhum: a rota e os filtros, de que o
 * cabeçalho ordenável, a busca, a lixeira e a paginação precisam para navegar.
 * Passar `to` e `search` em cada `ColumnDef` seria repetir os dois em toda
 * coluna de toda tela - e a declaração das colunas mora fora do componente,
 * longe de onde esses valores existem.
 */
export type TableContextValue = {
  /** A rota desta listagem, para os links de ordenação, busca e paginação. */
  to: string
  search: ListSearch
  /** A consulta está servindo a página anterior enquanto refaz a nova. */
  isPlaceholderData: boolean
  /**
   * A consulta falhou.
   *
   * Mora aqui e não em cada tela porque a decisão que ele governa é sempre a
   * mesma, e sempre a mesma ordem: **erro antes de vazio**. Uma consulta que
   * falhou também devolve zero linha, e anunciar "nenhum registro ainda" para
   * quem está sem rede convida a cadastrar de novo o que já existe.
   */
  isError: boolean
  /** Refaz a consulta. Ausente quando a tela não passou `onRetry`. */
  onRetry?: () => void
}

const TableContext = React.createContext<TableContextValue | null>(null)

export const TableProvider = TableContext.Provider

/**
 * A rota e os filtros da listagem, para quem está dentro de `Table`.
 *
 * O `consumer` entra na mensagem para o erro dizer **qual** subcomponente ficou
 * fora do provider - sem isso o `throw` reporta "faltou provider" e deixa a
 * busca por conta de quem lê a stack.
 */
export function useTableContext(consumer: string): TableContextValue {
  const context = React.use(TableContext)

  if (!context) {
    throw new Error(`\`${consumer}\` precisa estar dentro de \`Table\``)
  }

  return context
}
