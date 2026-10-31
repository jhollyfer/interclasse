import { ColumnsIcon } from '@phosphor-icons/react'
import type { RowData } from '@tanstack/react-table'
import type * as React from 'react'

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
import { m } from '#/paraglide/messages'

import type { TableInstance } from './use-table'

/**
 * Which columns appear.
 *
 * The label comes from `columnDef.meta.label` when it exists, and from the id when it does not -
 * `header` stopped working as a label when it became a header
 * component: `String(<TableColumnHeader/>)` prints `[object Object]`.
 */
export function TableColumnToggle<TRow extends RowData>({
  table,
}: Readonly<{
  table: TableInstance<TRow>
}>): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="table-column-toggle"
        render={
          <Button
            data-test-id="column-toggle"
            variant="outline"
            className="ml-auto"
          >
            <ColumnsIcon />
            {m.table_columns()}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        {/* The group is not decoration: `DropdownMenuLabel` is Base UI's `Menu.GroupLabel`,
            and it registers its own id as the `aria-labelledby` of the `Menu.Group`
            above. Without a group, `useMenuGroupRootContext()` throws
            "MenuGroupContext is missing" when the menu opens. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.table_columns_visible()}</DropdownMenuLabel>
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
