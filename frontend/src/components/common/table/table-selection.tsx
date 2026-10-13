import type * as React from 'react'
import { XIcon } from '@phosphor-icons/react'
import type { ColumnDef, RowData } from '@tanstack/react-table'

import { Button } from '#/components/ui/button'
import { ButtonGroup, ButtonGroupText } from '#/components/ui/button-group'
import { Checkbox } from '#/components/ui/checkbox'

import type { TableFeatures, TableInstance } from './use-table'

/**
 * A coluna de caixas de seleção, para espalhar antes das colunas da tela.
 *
 * `enableHiding: false` e `enableResizing: false`: ela é âncora da tabela, não
 * conteúdo - esconder a seleção deixaria as ações em massa inalcançáveis, e
 * redimensionar uma caixa de 16px não faz sentido.
 *
 * O indeterminado é `algum && !todos` porque na v9 `getIsSomePageRowsSelected()`
 * passou a significar **pelo menos um**, incluindo quando são todos. Usá-lo
 * sozinho deixaria a caixa em traço mesmo com a página inteira marcada.
 */
export function selectionColumn<TRow extends RowData>(): ColumnDef<
  TableFeatures,
  TRow
> {
  return {
    id: '_select',
    size: 40,
    enableHiding: false,
    enableResizing: false,
    header: ({ table }) => {
      const some = table.getIsSomePageRowsSelected()
      const all = table.getIsAllPageRowsSelected()

      return (
        <Checkbox
          checked={all}
          // No Base UI o traço é uma prop à parte, e não um terceiro valor de
          // `checked` - o componente aceita só booleano ali.
          indeterminate={some && !all}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todas as linhas da página"
        />
      )
    },
    cell: ({ row }) => (
      // O clique na caixa não pode também abrir o registro.
      <div onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          // O predicado de `selectable` chega aqui: linha que a API recusaria
          // arquivar não entra na seleção, e a caixa diz isso antes do clique.
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selecionar linha"
        />
      </div>
    ),
  }
}

type TableSelectionBarProps<TRow extends RowData> = {
  table: TableInstance<TRow>
  /** O nome do recurso no singular e no plural: `['tabela', 'tabelas']`. */
  noun: [string, string]
  /** Os botões de ação. Recebem as linhas selecionadas. */
  children: (rows: Array<TRow>) => React.ReactNode
}

/**
 * A barra que aparece quando há linhas selecionadas.
 *
 * `sticky bottom-4` dentro da área que rola: ela acompanha a lista em vez de
 * ficar presa ao fim dela, então continua alcançável com 50 linhas na tela.
 *
 * Some sozinha quando a seleção zera - não há estado de "barra aberta e vazia"
 * a manter.
 */
export function TableSelectionBar<TRow extends RowData>({
  table,
  noun,
  children,
}: TableSelectionBarProps<TRow>): React.JSX.Element | null {
  const selected = table.getSelectedRowModel().rows
  const count = selected.length

  if (count === 0) return null

  const [singular, plural] = noun

  /**
   * "Seleção:" e não "selecionadas": a referência fixa o particípio no feminino,
   * o que aqui daria "3 eventos selecionadas" em seis dos sete recursos. Pôr um
   * gênero no `noun` seria desenho que a referência não tem; a forma sem
   * particípio concorda com os dois e diz a mesma coisa.
   */
  let label = `Seleção: ${count} ${plural}`
  if (count === 1) label = `Seleção: 1 ${singular}`

  return (
    // Barra de ações sobre a seleção, e por isso `ButtonGroup`. Os filhos
    // entram em grupos aninhados porque são ações independentes - colá-las
    // desenharia um controle segmentado, que é outra coisa.
    <ButtonGroup
      data-slot="table-selection-bar"
      data-test-id="selection-bar"
      className="sticky bottom-4 z-20 mx-auto max-w-[calc(100%-1rem)] flex-wrap items-center justify-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg"
    >
      <ButtonGroupText className="border-0 bg-transparent px-0 text-sm font-medium">
        {label}
      </ButtonGroupText>

      <ButtonGroup>{children(selected.map((row) => row.original))}</ButtonGroup>

      <ButtonGroup>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Limpar seleção"
          onClick={() => table.resetRowSelection()}
        >
          <XIcon />
        </Button>
      </ButtonGroup>
    </ButtonGroup>
  )
}
