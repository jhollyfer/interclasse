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
       * Os alertas que os itens abrem (`RowActionsConfirm`). Ficam **irmãos**
       * do menu, e não dentro do `DropdownMenuContent`: o conteúdo desmonta
       * quando o menu fecha e levaria o alerta junto (`frontend.md` §6.2).
       */
      dialogs?: React.ReactNode
    }
  >
>

/**
 * O menu de uma linha da tabela.
 *
 * O casco é o mesmo em toda listagem do painel - o mesmo gatilho de três
 * pontos, o mesmo grupo, o mesmo rótulo "Ações", o mesmo separador. Só a
 * largura varia, e por isso ela é a única coisa que continua chegando de
 * fora.
 *
 * Não há contexto: os itens não leem estado nenhum do casco. O item que pede
 * confirmação chama `handle.open(null)` no clique, o menu fecha sozinho e o
 * alerta, irmão do menu, abre pelo mesmo handle.
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
