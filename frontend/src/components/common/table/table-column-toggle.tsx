import type * as React from 'react'
import { ColumnsIcon } from '@phosphor-icons/react'
import type { RowData } from '@tanstack/react-table'

import type { TableInstance } from './use-table'

import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

/**
 * Quais colunas aparecem.
 *
 * O rótulo sai de `columnDef.meta.label` quando existe, e do id quando não -
 * `header` deixou de servir como rótulo quando virou um componente de
 * cabeçalho: `String(<TableColumnHeader/>)` imprime `[object Object]`.
 */
export function TableColumnToggle<TRow extends RowData>({
  table,
}: {
  table: TableInstance<TRow>
}): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            data-test-id="column-toggle"
            variant="outline"
            className="ml-auto"
          >
            <ColumnsIcon />
            Colunas
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        {/* O grupo não é enfeite: `DropdownMenuLabel` é o `Menu.GroupLabel` do
            Base UI, e ele registra o próprio id como `aria-labelledby` do
            `Menu.Group` acima. Sem grupo, `useMenuGroupRootContext()` lança
            "MenuGroupContext is missing" ao abrir o menu. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                data-test-id={`column-toggle-${column.id}`}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(value)}
              >
                {column.columnDef.meta?.label ?? column.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
