import { TableLayout } from '@interclasse/shared'
import {
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  tableFeatures as tableFeaturesRoot,
  useTable as useTableRoot,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  RowData,
  RowSelectionState,
  ColumnVisibilityState,
} from '@tanstack/react-table'
import * as React from 'react'

import { readLocal, writeLocal } from '#/lib/local-store'
import { m } from '#/paraglide/messages'

import { selectionColumn } from './table-selection'

/**
 * As features registradas nas tabelas do painel.
 *
 * **Ordenar e filtrar não estão aqui, e é de propósito.** Quem pagina é o
 * backend: ordenar as 20 linhas em mãos daria uma ordem que só vale para elas, e
 * a linha 21 apareceria fora de lugar na página seguinte. O cabeçalho escreve
 * `?sort` na URL e o loader refaz a consulta - ver `table-column-header.tsx`.
 *
 * `rowPaginationFeature` fica de fora pelo mesmo motivo: no modo manual a tabela
 * não deve fatiar nada, ela já recebe a página pronta.
 *
 * O que sobra é layout - o que a pessoa arruma na tela e espera reencontrar
 * amanhã - mais a seleção, que é efêmera.
 */
export const tableFeatures = tableFeaturesRoot({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnPinningFeature,
  rowSelectionFeature,
})

export type TableFeatures = typeof tableFeatures

export type TableColumns<TRow extends RowData> = Array<
  ColumnDef<TableFeatures, TRow>
>

/** O que persiste entre sessões. Seleção não entra: ela morre com a página. */
type PersistedLayout = TableLayout

/**
 * O tema do layout no `lib/local-store.ts`, que monta a chave
 * `interclasse:data-table:<recurso>:v1`.
 *
 * A chave nova descarta de propósito o layout gravado antes (`data-table:v2:`):
 * um `columnVisibility['_actions'] === false` salvo escondia o menu de ações
 * **para sempre**, porque o `table-core` consulta o estado salvo antes de olhar
 * a definição da coluna, e `enableHiding: false` não protegia nada
 * (`features/column-visibility/columnVisibilityFeature.utils.js`,
 * `column_getIsVisible`). Quando o formato mudar de novo, sobe o `v1` de lá.
 */
const THEME_PREFIX = 'data-table:'

/**
 * As colunas que esta casca monta sozinha. Não são conteúdo, são âncoras: sem a
 * caixa de seleção a barra de ações em massa fica inalcançável, e sem o menu de
 * ações a linha não tem como ser editada nem arquivada.
 */
const ANCHOR_COLUMNS = ['_select', '_actions']

/** O intervalo em que uma largura salva ainda é uma largura. */
const MIN_COLUMN_SIZE = 40
const MAX_COLUMN_SIZE = 640

/**
 * Lê o layout salvo, validado e saneado. Devolve vazio em qualquer falha - JSON
 * corrompido ou fora da forma não pode derrubar a tela, e o custo de errar é a
 * tabela abrir no default.
 *
 * O saneamento existe porque este dado sobrevive a deploy: uma preferência
 * gravada num dia ruim continua valendo meses depois. Duas regras bastam para o
 * que já mordeu: âncora não fica invisível, e largura fica dentro de um
 * intervalo plausível.
 */
function readLayout(key: string | undefined): PersistedLayout {
  if (!key) return {}

  const saved = readLocal({
    theme: THEME_PREFIX.concat(key),
    schema: TableLayout,
    fallback: {},
  })

  let columnVisibility = saved.columnVisibility
  if (columnVisibility) {
    columnVisibility = Object.fromEntries(
      Object.entries(columnVisibility).filter(
        ([id]) => !ANCHOR_COLUMNS.includes(id),
      ),
    )
  }

  let columnSizing = saved.columnSizing
  if (columnSizing) {
    columnSizing = Object.fromEntries(
      Object.entries(columnSizing).filter(
        ([, size]) => size >= MIN_COLUMN_SIZE && size <= MAX_COLUMN_SIZE,
      ),
    )
  }

  return { ...saved, columnVisibility, columnSizing }
}

function writeLayout(key: string | undefined, layout: PersistedLayout): void {
  if (!key) return

  writeLocal(THEME_PREFIX.concat(key), layout)
}

type UseTableOptions<TRow extends RowData> = {
  rows: ReadonlyArray<TRow>
  columns: TableColumns<TRow>
  getRowId: (row: TRow) => string
  /**
   * A chave do layout salvo (`'administrator:testimonials'`). Ausente, nada
   * persiste - é o que se quer numa tabela efêmera, como a de um dialog.
   */
  persistKey?: string
  /** O menu de ações de cada linha, na última coluna. */
  actions?: (row: TRow) => React.ReactNode
  /**
   * Liga a caixa de seleção e, com ela, a barra de ações em massa.
   *
   * Um predicado no lugar de `true` decide linha a linha, e é o que `users`
   * usa: arquivar a própria conta é `403 SELF_ARCHIVE_FORBIDDEN`, então a
   * caixa dela nasce desabilitada. Filtrar depois, na hora de arquivar, daria
   * uma barra dizendo "3 selecionados" e um aviso dizendo "2 arquivados".
   */
  selectable?: boolean | ((row: TRow) => boolean)
}

/**
 * A tabela do painel: features registradas, layout persistido, seleção em
 * memória.
 *
 * O layout começa no que estiver salvo e é regravado a cada mudança, num
 * `useEffect` só. Salvar dentro de cada `onChange` seria quatro pontos de
 * escrita para manter em sincronia; um efeito sobre o estado final é um.
 *
 * A hidratação é o motivo de o estado inicial **não** ler o `localStorage`
 * direto: o servidor renderiza sem ele, e um estado diferente no primeiro
 * render do cliente é divergência de hidratação. O layout entra depois de
 * montar, num efeito.
 */
export function useTable<TRow extends RowData>({
  rows,
  columns,
  getRowId,
  persistKey,
  actions,
  selectable = false,
}: UseTableOptions<TRow>) {
  const hasActions = Boolean(actions)
  const hasSelection = Boolean(selectable)

  // Seleção e ações são colunas montadas aqui, e não pedidas a cada tela: a
  // primeira é sempre igual e esquecê-la deixaria a barra de ações em massa
  // inalcançável; a última era, antes, uma `<TableHead/>` solta fora do modelo
  // de colunas - invisível para fixação, largura e ordem. Sem `useMemo`: o
  // React Compiler memoiza o array pelas dependências que ele lê
  // (_doc-lib/tanstack-table.md#framework/react/guide/react-compiler).
  const allColumns: TableColumns<TRow> = []

  if (hasSelection) allColumns.push(selectionColumn<TRow>())

  allColumns.push(...columns)

  if (hasActions) {
    allColumns.push({
      id: '_actions',
      size: 56,
      enableHiding: false,
      enableResizing: false,
      // A coluna existe e precisa se anunciar. Sem `header` o `<th>` saía
      // vazio: para quem lê a tabela por leitor de tela, a última coluna não
      // tinha nome nenhum. `sr-only` porque na tela o rótulo competiria com
      // um menu de 24px que já se explica pelo ícone.
      header: () => <span className="sr-only">{m.common_actions()}</span>,
      cell: ({ row }) => (
        // O menu não pode disparar o clique da linha atrás dele.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- só contém o clique: o teclado não atravessa a borda
        <div onClick={(event) => event.stopPropagation()}>
          {actions?.(row.original)}
        </div>
      ),
    })
  }

  // A caixa de seleção e o menu ficam visíveis ao rolar na horizontal: sem eles
  // ancorados, marcar a linha certa numa tabela larga vira adivinhação.
  const pinStart: Array<string> = []
  const pinEnd: Array<string> = []

  if (hasSelection) pinStart.push('_select')
  if (hasActions) pinEnd.push('_actions')

  let initialPinning: ColumnPinningState | undefined = undefined
  if (pinStart.length > 0 || pinEnd.length > 0)
    initialPinning = { start: pinStart, end: pinEnd }

  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  // O default do estado é montado à parte: `initialPinning ?? {}` alarga o tipo
  // para `ColumnPinningState | {}`, e o `useState` recusa a união.
  const emptyPinning: ColumnPinningState = { start: [], end: [] }
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialPinning ?? emptyPinning,
  )
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const [hydrated, setHydrated] = React.useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- o servidor não tem o layout salvo: lê-lo no estado inicial diverge a hidratação (frontend.md §3.2) */
  React.useEffect(() => {
    const saved = readLayout(persistKey)

    if (saved.columnVisibility) setColumnVisibility(saved.columnVisibility)
    if (saved.columnOrder) setColumnOrder(saved.columnOrder)
    if (saved.columnSizing) setColumnSizing(saved.columnSizing)
    if (saved.columnPinning) setColumnPinning(saved.columnPinning)

    setHydrated(true)
  }, [persistKey])
  /* eslint-enable react-hooks/set-state-in-effect -- fim do trecho que lê o layout salvo */

  React.useEffect(() => {
    // Antes de hidratar o estado ainda é o default, e gravá-lo apagaria o que
    // está salvo.
    if (!hydrated) return

    writeLayout(persistKey, {
      columnVisibility,
      columnOrder,
      columnSizing,
      columnPinning,
    })
  }, [
    hydrated,
    persistKey,
    columnVisibility,
    columnOrder,
    columnSizing,
    columnPinning,
  ])

  // `selectable` aceita booleano ou predicado, e o TanStack aceita os dois na
  // mesma prop — isto é só a ponte entre as duas formas.
  let canSelectRow: boolean | ((row: { original: TRow }) => boolean) = false
  if (typeof selectable === 'boolean') canSelectRow = selectable
  if (typeof selectable === 'function') {
    const permite = selectable
    canSelectRow = (row) => permite(row.original)
  }

  return useTableRoot({
    features: tableFeatures,
    data: rows,
    columns: allColumns,
    getRowId,
    enableRowSelection: canSelectRow,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      columnVisibility,
      columnOrder,
      columnSizing,
      columnPinning,
      rowSelection,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
    onRowSelectionChange: setRowSelection,
  })
}

export type TableInstance<TRow extends RowData> = ReturnType<
  typeof useTable<TRow>
>
