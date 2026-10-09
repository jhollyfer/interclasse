import * as React from 'react'
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

import { selectionColumn } from './table-selection'

/**
 * As features registradas nas tabelas do painel.
 *
 * **Ordenar e filtrar não estão aqui, e é de propósito.** Quem pagina é o
 * backend: ordenar as 20 linhas em mãos daria uma ordem que só vale para elas, e
 * a linha 21 apareceria fora de lugar na página seguinte. O cabeçalho escreve
 * `?sort` na URL e o loader refaz a consulta - ver `data-table-column-header`.
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
type PersistedLayout = {
  columnVisibility?: ColumnVisibilityState
  columnOrder?: ColumnOrderState
  columnSizing?: ColumnSizingState
  columnPinning?: ColumnPinningState
}

/**
 * `v2` porque o layout salvo é durável e o que já está gravado está errado.
 *
 * Até aqui um `columnVisibility['_actions'] === false` gravado escondia o menu
 * de ações **para sempre**: o `table-core` consulta o estado salvo antes de
 * olhar a definição da coluna, então `enableHiding: false` não protegia nada
 * (`features/column-visibility/columnVisibilityFeature.utils.js`,
 * `column_getIsVisible`). Recarregar não resolvia, e trocar o código também
 * não - a chave é por navegador e por recurso, o que explica o menu sumido em
 * alguns recursos e não em outros. Subir a versão descarta o que está lá.
 */
const STORAGE_PREFIX = 'data-table:v2:'

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
 * Lê o layout salvo, saneado. Devolve vazio em qualquer falha - JSON corrompido
 * no `localStorage` não pode derrubar a tela, e o custo de errar é a tabela
 * abrir no default.
 *
 * O saneamento existe porque este dado sobrevive a deploy: uma preferência
 * gravada num dia ruim continua valendo meses depois, e a tela não tem como
 * saber que o que está lendo é lixo. Duas regras bastam para o que já mordeu:
 * âncora não fica invisível, e largura fica dentro de um intervalo plausível.
 */
function readLayout(key: string | undefined): PersistedLayout {
  if (!key) return {}
  // No servidor não há `localStorage`, e o primeiro render acontece lá.
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX.concat(key))
    if (!raw) return {}

    const saved: PersistedLayout = JSON.parse(raw)

    if (saved.columnVisibility) {
      for (const id of ANCHOR_COLUMNS) delete saved.columnVisibility[id]
    }

    if (saved.columnSizing) {
      for (const [id, size] of Object.entries(saved.columnSizing)) {
        if (size >= MIN_COLUMN_SIZE && size <= MAX_COLUMN_SIZE) continue

        delete saved.columnSizing[id]
      }
    }

    return saved
  } catch {
    return {}
  }
}

function writeLayout(key: string | undefined, layout: PersistedLayout): void {
  if (!key) return
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      STORAGE_PREFIX.concat(key),
      JSON.stringify(layout),
    )
  } catch {
    // Cota estourada ou modo privativo: o layout não persiste e a tela segue.
  }
}

type UseTableOptions<TRow extends RowData> = {
  rows: Array<TRow>
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
  // `actions` chega como arrow inline de cada tela (`actions: (notice) =>
  // <NoticeRowActions .../>`), então é uma função nova a cada render e a lista
  // de dependências abaixo nunca casaria: o array de colunas era reconstruído a
  // cada tecla digitada na busca. A ref guarda a versão de agora sem entrar na
  // dependência, e o que decide a **forma** da tabela - ter ou não ter a coluna
  // - é um booleano, que é estável.
  //
  // `enableRowSelection` continua lendo `selectable` direto, e é de propósito:
  // ele é chamado, não memoizado, e o predicado de `users` precisa enxergar a
  // conta de agora.
  const actionsRef = React.useRef(actions)
  actionsRef.current = actions

  const hasActions = Boolean(actions)
  const hasSelection = Boolean(selectable)

  // Seleção e ações são colunas montadas aqui, e não pedidas a cada tela: a
  // primeira é sempre igual e esquecê-la deixaria a barra de ações em massa
  // inalcançável; a última era, antes, uma `<TableHead/>` solta fora do modelo
  // de colunas - invisível para fixação, largura e ordem.
  const allColumns = React.useMemo(() => {
    const result: TableColumns<TRow> = []

    if (hasSelection) result.push(selectionColumn<TRow>())

    result.push(...columns)

    if (hasActions) {
      result.push({
        id: '_actions',
        size: 56,
        enableHiding: false,
        enableResizing: false,
        // A coluna existe e precisa se anunciar. Sem `header` o `<th>` saía
        // vazio: para quem lê a tabela por leitor de tela, a última coluna não
        // tinha nome nenhum. `sr-only` porque na tela o rótulo competiria com
        // um menu de 24px que já se explica pelo ícone.
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => (
          // O menu não pode disparar o clique da linha atrás dele.
          <div onClick={(event) => event.stopPropagation()}>
            {actionsRef.current?.(row.original)}
          </div>
        ),
      })
    }

    return result
  }, [columns, hasSelection, hasActions])

  // A caixa de seleção e o menu ficam visíveis ao rolar na horizontal: sem eles
  // ancorados, marcar a linha certa numa tabela larga vira adivinhação.
  const initialPinning = React.useMemo(() => {
    const start: Array<string> = []
    const end: Array<string> = []

    if (hasSelection) start.push('_select')
    if (hasActions) end.push('_actions')

    if (start.length === 0 && end.length === 0) return undefined

    return { start, end }
  }, [hasSelection, hasActions])

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

  React.useEffect(() => {
    const saved = readLayout(persistKey)

    if (saved.columnVisibility) setColumnVisibility(saved.columnVisibility)
    if (saved.columnOrder) setColumnOrder(saved.columnOrder)
    if (saved.columnSizing) setColumnSizing(saved.columnSizing)
    if (saved.columnPinning) setColumnPinning(saved.columnPinning)

    setHydrated(true)
  }, [persistKey])

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
