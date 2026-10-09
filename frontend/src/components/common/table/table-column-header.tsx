import type * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from '@phosphor-icons/react'
import type { Column, RowData } from '@tanstack/react-table'

import { useTableContext } from './table-context'
import type { TableFeatures } from './use-table'

import { Button } from '#/components/ui/button'
import { ButtonGroup, ButtonGroupText } from '#/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { SortDirections } from '#/lib/entity'
import type { SortDirection } from '#/lib/entity'

type TableColumnHeaderProps<TRow extends RowData> = {
  /** O rótulo da coluna. */
  children: React.ReactNode
  /**
   * A coluna do backend por trás desta. Ausente, o cabeçalho é só o título -
   * nem toda coluna da tela existe como coluna no banco.
   */
  sortKey?: string
  column?: Column<TableFeatures, TRow, unknown>
}

/**
 * O cabeçalho de uma coluna: título, ordenação e fixação.
 *
 * **A ordem vai para a URL, não para a tabela.** Registrar `rowSortingFeature`
 * ordenaria as 20 linhas da página em mãos - a linha 21, que está na página
 * seguinte, apareceria fora de lugar. O menu escreve `?sort` e `?direction`, o
 * loader refaz a consulta, e o backend devolve a página certa já ordenada.
 *
 * A fixação, ao contrário, é decisão de tela e mora na tabela: qual coluna
 * continua visível ao rolar na horizontal não é pergunta que o servidor
 * responde.
 */
export function TableColumnHeader<TRow extends RowData>({
  children,
  sortKey,
  column,
}: TableColumnHeaderProps<TRow>): React.JSX.Element {
  const { to, search } = useTableContext('TableColumnHeader')
  const navigate = useNavigate()

  const pinned = column?.getIsPinned()
  const canPin = Boolean(column)

  // Sem coluna do banco nem coluna da tabela não há menu nenhum a oferecer.
  if (!sortKey && !canPin)
    return <span className="font-medium">{children}</span>

  let direction: SortDirection | undefined = undefined
  if (sortKey && search.sort === sortKey) direction = search.direction

  function sort(next: SortDirection): void {
    navigate({
      to,
      // A ordem muda a página 1 tanto quanto o filtro: manter `page` levaria a
      // uma página que não existe mais na ordem nova.
      search: { ...search, sort: sortKey, direction: next, page: undefined },
    })
  }

  return (
    <ButtonGroup
      data-slot="table-column-header"
      data-test-id={`column-header-${column?.id ?? sortKey}`}
      className="items-center gap-0.5"
    >
      <ButtonGroupText className="border-0 bg-transparent px-0 font-medium">
        {children}
      </ButtonGroupText>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              // O rótulo em texto puro sai de `meta.label` - o que o slot recebe
              // é markup, e `String(elemento)` daria `[object Object]`.
              aria-label={`Opções de ${column?.columnDef.meta?.label ?? 'coluna'}`}
            >
              {direction === SortDirections.ASC && <ArrowUpIcon />}
              {direction === SortDirections.DESC && <ArrowDownIcon />}
              {!direction && <ArrowsDownUpIcon className="opacity-40" />}
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {sortKey && (
            <>
              <DropdownMenuItem
                data-test-id="sort-asc"
                onClick={() => sort(SortDirections.ASC)}
              >
                <ArrowUpIcon />
                Crescente
              </DropdownMenuItem>
              <DropdownMenuItem
                data-test-id="sort-desc"
                onClick={() => sort(SortDirections.DESC)}
              >
                <ArrowDownIcon />
                Decrescente
              </DropdownMenuItem>
            </>
          )}

          {sortKey && canPin && <DropdownMenuSeparator />}

          {/*
            `start`/`end` e não `left`/`right`: na v9 a fixação é lógica, então
            ela acompanha a direção do texto em vez de cravar um lado da tela.
          */}
          {canPin && pinned !== 'start' && (
            <DropdownMenuItem onClick={() => column?.pin('start')}>
              <PushPinIcon />
              Fixar no início
            </DropdownMenuItem>
          )}
          {canPin && pinned !== 'end' && (
            <DropdownMenuItem onClick={() => column?.pin('end')}>
              <PushPinIcon className="rotate-90" />
              Fixar no fim
            </DropdownMenuItem>
          )}
          {canPin && pinned && (
            <DropdownMenuItem onClick={() => column?.pin(false)}>
              <PushPinSlashIcon />
              Desafixar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}
