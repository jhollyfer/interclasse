import * as React from 'react'
import { DotsThreeIcon } from '@phosphor-icons/react'

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

/**
 * O menu de uma linha da tabela.
 *
 * O casco é o mesmo em toda listagem do painel - o mesmo gatilho de três
 * pontos, o mesmo grupo, o mesmo rótulo "Ações", o mesmo separador. Só a
 * largura varia, e por isso ela é a única coisa que continua chegando de
 * fora.
 *
 * Não há contexto: os itens não leem estado nenhum do casco, cada um se basta
 * com o `onConfirm` que a tela lhe dá.
 */
/**
 * Fecha o menu. Os itens que abrem alerta chamam ao abrir: sem isso o menu
 * ficava aceso atrás do overlay. O menu fica montado (`keepMounted`) porque o
 * alerta mora dentro dele - desmontar o menu levaria o alerta junto.
 */
const RowActionsMenuContext = React.createContext<() => void>(() => {})

export function useCloseRowActions(): () => void {
  return React.useContext(RowActionsMenuContext)
}

export function RowActions({
  className,
  children,
  ...rest
}: React.ComponentProps<typeof DropdownMenuContent>): React.JSX.Element {
  const [open, setOpen] = React.useState(false)
  const close = React.useCallback(() => setOpen(false), [])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
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
        keepMounted
        {...rest}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.common_actions()}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <RowActionsMenuContext.Provider value={close}>
            {children}
          </RowActionsMenuContext.Provider>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
