import * as React from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'

import { ConfirmDialogProvider } from './confirm-dialog-context'

type ConfirmDialogProps = {
  /**
   * O elemento visível que abre o alerta - em geral um `DropdownMenuItem` com
   * `closeOnClick={false}`, porque sem isso o menu fecha e leva o gatilho antes
   * do alerta aparecer.
   *
   * Segue prop e não slot: é o elemento de **fora** do dialog, e a primitiva
   * precisa dele na posição de `render` para herdar os handlers de abertura.
   */
  trigger?: React.ReactElement
  /**
   * Aberto por fora, sem gatilho: é o caso do item de menu. Como gatilho, o
   * item herdava `tabindex=0` do alerta e virava o foco inicial do menu.
   */
  open?: boolean
  onConfirm: () => void
  /** Ação sem volta pinta o botão de confirmar de vermelho. */
  destructive?: boolean
  /** Avisa quem contém o gatilho - o menu de linha fecha quando o alerta abre. */
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

/**
 * A confirmação de toda ação que remove ou arquiva.
 *
 * `AlertDialog` e não `Dialog`: o alerta não fecha ao clicar fora nem no Esc, e
 * é essa a diferença que importa aqui - um clique distraído fora do dialog não
 * pode ser a resposta a "apagar de vez?".
 *
 * As partes são finas de propósito. Foco, Esc, portal e ARIA continuam sendo do
 * `ui/alert-dialog`, que já é compound; o que se acrescenta aqui é só o texto
 * virar slot, para a tela fora da curva pôr um `<Alert>` ou um `<Checkbox>` na
 * descrição sem que isso vire mais uma prop opcional para todas as outras.
 */
export function ConfirmDialog({
  trigger,
  onConfirm,
  destructive = false,
  open,
  onOpenChange,
  children,
}: ConfirmDialogProps): React.JSX.Element {
  // Controlado sempre, por dentro ou por fora: confirmar fecha o alerta. O
  // resultado chega por toast, e com erro o alerta ficava aberto esperando um
  // "Cancelar".
  const [inner, setInner] = React.useState(false)
  const isOpen = open ?? inner
  const change = React.useCallback(
    (next: boolean) => {
      setInner(next)
      onOpenChange?.(next)
    },
    [onOpenChange],
  )

  // Sem `useMemo` o objeto é novo a cada render da tela e o botão de confirmar
  // re-renderiza junto, mesmo com a ação igual.
  const value = React.useMemo(
    () => ({
      onConfirm: () => {
        change(false)
        onConfirm()
      },
      destructive,
    }),
    [change, onConfirm, destructive],
  )

  return (
    <AlertDialog open={isOpen} onOpenChange={change}>
      {trigger && <AlertDialogTrigger render={trigger} />}
      <AlertDialogContent data-slot="confirm-dialog">
        <ConfirmDialogProvider value={value}>{children}</ConfirmDialogProvider>
      </AlertDialogContent>
    </AlertDialog>
  )
}
