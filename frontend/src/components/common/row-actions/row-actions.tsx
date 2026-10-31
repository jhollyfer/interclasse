import type { Merge } from '@interclasse/shared'
import { DotsThreeIcon } from '@phosphor-icons/react'
import * as React from 'react'

import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

type RowActionsProps = Readonly<
  Merge<
    React.ComponentProps<typeof DropdownMenuContent>,
    {
      /**
       * The alerts the items open (`RowActionsConfirm`). They are **siblings**
       * of the menu, and not inside `DropdownMenuContent`: the content unmounts
       * when the menu closes and would take the alert with it (`frontend.md` §6.2).
       */
      dialogs?: React.ReactNode
    }
  >
>

/**
 * A table row's menu.
 *
 * The shell is the same on every dashboard listing - the same three-dot trigger,
 * the same group, the same "Ações" label, the same separator. Only the
 * width varies, and that is why it is the only thing that still arrives from
 * outside.
 *
 * There is no context: the items read no state from the shell. The item that asks for
 * confirmation calls `handle.open(null)` on click, the menu closes on its own and the
 * alert, a sibling of the menu, opens through the same handle.
 */
export function RowActions({
  className,
  children,
  dialogs,
  ...rest
}: RowActionsProps): React.JSX.Element {
  return (
    <React.Fragment>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={m.common_open_actions()}
            >
              <DotsThreeIcon weight="bold" />
            </Button>
          }
        />
        <DropdownMenuContent
          data-slot="row-actions"
          className={cn('w-48', className)}
          {...rest}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>{m.common_actions()}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {children}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </React.Fragment>
  )
}
