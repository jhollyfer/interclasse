import * as React from 'react'

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import type { Merge } from '#/lib/merge'
import { m } from '#/paraglide/messages'

import { useConfirmDialogContext } from './confirm-dialog-context'

/**
 * A linha de botões. Em telas estreitas ela empilha, com a saída por cima.
 *
 * Sem children, "Cancelar" e "Confirmar": um rodapé vazio deixava o alerta sem
 * botão nenhum, e quem abria só saía pelo Esc.
 */
export function ConfirmDialogFooter({
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogFooter>): React.JSX.Element {
  return (
    <AlertDialogFooter data-slot="confirm-dialog-footer" {...props}>
      {children ?? (
        <React.Fragment>
          <ConfirmDialogCancel />
          <ConfirmDialogConfirm>{m.common_confirm()}</ConfirmDialogConfirm>
        </React.Fragment>
      )}
    </AlertDialogFooter>
  )
}

/**
 * A saída. Sem children escreve "Cancelar", que é o que toda confirmação do
 * painel diz.
 */
export function ConfirmDialogCancel({
  children = m.common_cancel(),
  ...rest
}: React.ComponentProps<typeof Button>): React.JSX.Element {
  return (
    <AlertDialogCancel
      data-slot="confirm-dialog-cancel"
      render={
        <Button variant="outline" {...rest}>
          {children}
        </Button>
      }
    />
  )
}

type ConfirmDialogConfirmProps = Readonly<
  Merge<React.ComponentProps<typeof Button>, { children: React.ReactNode }>
>

/**
 * O botão que confirma.
 *
 * A ação e o peso dela vêm do contexto, não de prop: quem os declara é a tela,
 * no `ConfirmDialog`, e repeti-los aqui daria duas fontes de verdade para a
 * mesma decisão.
 */
export function ConfirmDialogConfirm({
  children,
  ...rest
}: ConfirmDialogConfirmProps): React.JSX.Element {
  const { onConfirm, destructive } = useConfirmDialogContext(
    'ConfirmDialogConfirm',
  )

  let variant: 'destructive' | 'default' = 'default'
  if (destructive) variant = 'destructive'

  // `variant` direto no `AlertDialogAction`, que já é um `Button`: por
  // `render`, o `Button` de fora aplicava as classes do `default` por cima, e
  // o "Remover" saía verde.
  return (
    <AlertDialogAction
      data-slot="confirm-dialog-confirm"
      variant={variant}
      onClick={onConfirm}
      {...rest}
    >
      {children}
    </AlertDialogAction>
  )
}
