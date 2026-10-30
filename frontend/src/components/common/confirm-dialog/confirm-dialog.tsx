import * as React from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import type { ConfirmHandle } from '#/lib/dialog-handle'

import { ConfirmDialogProvider } from './confirm-dialog-context'

type ConfirmDialogProps<TPayload> = Readonly<{
  /**
   * O elemento visível que abre o alerta - em geral um `Button`.
   *
   * Segue prop e não slot: é o elemento de **fora** do dialog, e a primitiva
   * precisa dele na posição de `render` para herdar os handlers de abertura.
   * Sem ele, o alerta abre por `handle` (item de menu, linha de tabela).
   */
  render?: React.ReactElement
  /**
   * `false` quando o gatilho não é `<button>` (item de menu é `<div>`): a
   * primitiva tira a semântica de botão nativo em vez de avisar no console
   * (`_doc-lib/base-ui.md#react/components/alert-dialog`, prop `nativeButton`).
   */
  nativeButton?: boolean
  /**
   * Abre o alerta de fora, sem gatilho: `handle.open(null)` no clique do item
   * de menu. Um handle por alerta, criado com `createConfirmHandle`.
   */
  handle?: ConfirmHandle<TPayload>
  /** O elemento que recebe o foco ao fechar, quando não há gatilho. */
  finalFocus?: React.RefObject<HTMLElement | null>
  /** Recebe o payload do `openWithPayload`, quando o alerta foi aberto com um. */
  onConfirm: (payload: TPayload | undefined) => void
  /** Ação sem volta pinta o botão de confirmar de vermelho. */
  destructive?: boolean
  /**
   * O conteúdo do alerta. Em função, recebe o payload de
   * `handle.openWithPayload(dado)`: um alerta só para a tabela inteira, e o
   * texto sai do registro clicado.
   */
  children: React.ReactNode | ((payload: TPayload) => React.ReactNode)
}>

/**
 * A confirmação de toda ação que remove ou arquiva.
 *
 * `AlertDialog` e não `Dialog`: o alerta não fecha ao clicar fora nem no Esc, e
 * é essa a diferença que importa aqui - um clique distraído fora do dialog não
 * pode ser a resposta a "apagar de vez?".
 *
 * Uncontrolled (`frontend.md` §6.2): abre pelo gatilho ou pelo `handle` e
 * fecha pelo Cancelar ou pelo Confirmar, que são `Close` da primitiva. O
 * resultado da ação chega por toast.
 *
 * As partes são finas de propósito. Foco, Esc, portal e ARIA continuam sendo do
 * `ui/alert-dialog`, que já é compound; o que se acrescenta aqui é só o texto
 * virar slot, para a tela fora da curva pôr um `<Alert>` ou um `<Checkbox>` na
 * descrição sem que isso vire mais uma prop opcional para todas as outras.
 */
export function ConfirmDialog<TPayload = undefined>({
  render,
  nativeButton = true,
  handle,
  finalFocus,
  onConfirm,
  destructive = false,
  children,
}: ConfirmDialogProps<TPayload>): React.JSX.Element {
  return (
    <AlertDialog handle={handle}>
      {({ payload }) => {
        // Texto fixo passa direto; em função, só depois de haver payload.
        let body: React.ReactNode = null
        if (typeof children !== 'function') body = children
        if (typeof children === 'function' && payload !== undefined)
          body = children(payload)

        // Sem `useMemo`: o React Compiler memoiza o objeto pelo que ele lê.
        const value = { onConfirm: () => onConfirm(payload), destructive }

        return (
          <React.Fragment>
            {render && (
              <AlertDialogTrigger render={render} nativeButton={nativeButton} />
            )}
            <AlertDialogContent
              data-slot="confirm-dialog"
              finalFocus={finalFocus}
            >
              <ConfirmDialogProvider value={value}>
                {body}
              </ConfirmDialogProvider>
            </AlertDialogContent>
          </React.Fragment>
        )
      }}
    </AlertDialog>
  )
}
