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
   * The visible element that opens the alert - usually a `Button`.
   *
   * It stays a prop and not a slot: it is the element **outside** the dialog, and the primitive
   * needs it in the `render` position to inherit the opening handlers.
   * Without it, the alert opens by `handle` (menu item, table row).
   */
  render?: React.ReactElement
  /**
   * `false` when the trigger is not a `<button>` (a menu item is a `<div>`): the
   * primitive drops the native button semantics instead of warning in the console
   * (`_doc-lib/base-ui.md#react/components/alert-dialog`, prop `nativeButton`).
   */
  nativeButton?: boolean
  /**
   * Opens the alert from outside, with no trigger: `handle.open(null)` on the menu
   * item's click. One handle per alert, created with `createConfirmHandle`.
   */
  handle?: ConfirmHandle<TPayload>
  /** The element that receives focus on close, when there is no trigger. */
  finalFocus?: React.RefObject<HTMLElement | null>
  /** Receives the `openWithPayload` payload, when the alert was opened with one. */
  onConfirm: (payload: TPayload | undefined) => void
  /** An irreversible action paints the confirm button red. */
  destructive?: boolean
  /**
   * The alert's content. As a function, it receives the payload of
   * `handle.openWithPayload(data)`: one alert for the whole table, and the
   * text comes from the clicked record.
   */
  children: React.ReactNode | ((payload: TPayload) => React.ReactNode)
}>

/**
 * The confirmation for every action that removes or archives.
 *
 * `AlertDialog` and not `Dialog`: the alert does not close on an outside click or Esc, and
 * that is the difference that matters here - a distracted click outside the dialog cannot
 * be the answer to "apagar de vez?".
 *
 * Uncontrolled (`frontend.md` §6.2): opens by the trigger or by the `handle` and
 * closes by Cancelar or Confirmar, which are the primitive's `Close`. The
 * action's result arrives by toast.
 *
 * The parts are thin on purpose. Focus, Esc, portal and ARIA remain the job of
 * `ui/alert-dialog`, which is already a compound; what is added here is only the text
 * becoming a slot, so the off-curve screen can put an `<Alert>` or a `<Checkbox>` in the
 * description without that turning into one more optional prop for all the others.
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
        // Fixed text passes straight through; as a function, only once there is a payload.
        let body: React.ReactNode = null
        if (typeof children !== 'function') body = children
        if (typeof children === 'function' && payload !== undefined)
          body = children(payload)

        // No `useMemo`: the React Compiler memoizes the object by what it reads.
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
