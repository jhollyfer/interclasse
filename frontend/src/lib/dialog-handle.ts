import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

/**
 * As fábricas de handle, um lugar só (`frontend.md` §6.2): abrir um Dialog sem
 * clique no gatilho dele (item de menu, linha de tabela) é `handle.open(null)`
 * ou `handle.openWithPayload(dado)`, nunca `useState` de abertura nem clique
 * programático num botão. Cada componente cria o handle em
 * `React.useState(createDialogHandle)` - nunca no escopo do módulo, que no SSR
 * seria um store único compartilhado entre requisições.
 *
 * O alerta tem handle próprio: o de `Dialog` faria o alerta fechar no clique
 * fora. _doc-lib/base-ui.md#react/components/dialog,
 * #react/components/alert-dialog.
 */
export const createDialogHandle = DialogPrimitive.createHandle
export type DialogHandle<TPayload = unknown> = DialogPrimitive.Handle<TPayload>

export const createConfirmHandle = AlertDialogPrimitive.createHandle
export type ConfirmHandle<TPayload = unknown> =
  AlertDialogPrimitive.Handle<TPayload>
