import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

/**
 * The handle factories, in one place (`frontend.md` §6.2): opening a Dialog without
 * a click on its trigger (menu item, table row) is `handle.open(null)`
 * or `handle.openWithPayload(data)`, never an open `useState` nor a programmatic
 * click on a button. Each component creates the handle in
 * `React.useState(createDialogHandle)` - never at module scope, which in SSR
 * would be a single store shared between requests.
 *
 * The alert has its own handle: `Dialog`'s would make the alert close on an outside
 * click. _doc-lib/base-ui.md#react/components/dialog,
 * #react/components/alert-dialog.
 */
export const createDialogHandle = DialogPrimitive.createHandle
export type DialogHandle<TPayload = unknown> = DialogPrimitive.Handle<TPayload>

export const createConfirmHandle = AlertDialogPrimitive.createHandle
export type ConfirmHandle<TPayload = unknown> =
  AlertDialogPrimitive.Handle<TPayload>
