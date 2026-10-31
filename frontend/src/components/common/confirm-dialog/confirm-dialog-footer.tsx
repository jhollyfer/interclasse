import type { Merge } from '@interclasse/shared'
import * as React from 'react'

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'

import { useConfirmDialogContext } from './confirm-dialog-context'

/**
 * The row of buttons. On narrow screens it stacks, with the exit on top.
 *
 * Without children, "Cancelar" and "Confirmar": an empty footer left the alert with
 * no button at all, and whoever opened it could only leave with Esc.
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
 * The exit. Without children it writes "Cancelar", which is what every dashboard
 * confirmation says.
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
  Merge<
    Omit<React.ComponentProps<typeof Button>, 'children'>,
    { children: React.ReactNode }
  >
>

/**
 * The button that confirms.
 *
 * The action and its weight come from the context, not from a prop: the screen declares
 * them, in `ConfirmDialog`, and repeating them here would give two sources of truth for
 * the same decision.
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

  // `variant` directly on `AlertDialogAction`, which is already a `Button`: through
  // `render`, the outer `Button` applied the `default` classes on top, and
  // the "Remover" came out green.
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
