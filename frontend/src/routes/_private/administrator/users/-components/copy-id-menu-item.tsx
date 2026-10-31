import { CopySimpleIcon } from '@phosphor-icons/react'
import type * as React from 'react'
import { toast } from 'sonner'

import { DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { m } from '#/paraglide/messages'

type CopyIdMenuItemProps = Readonly<{
  id: string
}>

/**
 * "Copiar ID" in a row's menu.
 *
 * The id appears in no column - it is a uuid, it would take the width of two useful
 * columns and nobody reads it. But it is what opens the record by URL, what
 * gets pasted in a support ticket and what is taken to a database query, and
 * without this the path was to open the detail and copy from the address bar.
 *
 * A component and not a line on each screen: there are eight menus, and the alternative was
 * the same `writeText` with the same toast copied eight times.
 */
export function CopyIdMenuItem({ id }: CopyIdMenuItemProps): React.JSX.Element {
  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(id)
    toast.success(m.admin_users_id_copied(), { id: 'copy-id' })
  }

  return (
    <DropdownMenuItem onClick={() => void copy()}>
      <CopySimpleIcon />
      {m.admin_users_copy_id()}
    </DropdownMenuItem>
  )
}
