import type * as React from 'react'

import {
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'

/**
 * The top of the alert: title and description.
 *
 * It exists as a part, and not embedded in `ConfirmDialog`, because it carries the
 * grid and the alignment that `AlertDialogContent` does not provide - without it the
 * title and description would inherit the content's `gap-3` instead of a header's `gap-1`.
 */
export function ConfirmDialogHeader(
  props: React.ComponentProps<typeof AlertDialogHeader>,
): React.JSX.Element {
  return <AlertDialogHeader data-slot="confirm-dialog-header" {...props} />
}

/**
 * The action's icon, in the block that `AlertDialogHeader` already reserves for it.
 *
 * Outside `ConfirmDialogTitle` on purpose: the header switches grid when it
 * sees a `data-slot="alert-dialog-media"` (`has-data-[slot=...]`), and an icon
 * stuffed inside the title does not trigger that switch - it only pushes the text
 * aside and vanishes from the screen reader along with the rest of the title.
 *
 * It is the only one in the family that does **not** rewrite the `data-slot`: it is these
 * `ui/alert-dialog` selectors that read the slot, and renaming it would turn off the grid
 * the part exists to turn on.
 */
export function ConfirmDialogMedia(
  props: React.ComponentProps<typeof AlertDialogMedia>,
): React.JSX.Element {
  return <AlertDialogMedia {...props} />
}

/**
 * The title names the record: "Arquivar o depoimento de Maria?", never "Tem
 * certeza?". The primitive announces this element, so it cannot be missing.
 */
export function ConfirmDialogTitle(
  props: React.ComponentProps<typeof AlertDialogTitle>,
): React.JSX.Element {
  return <AlertDialogTitle data-slot="confirm-dialog-title" {...props} />
}

/**
 * What happens if confirmed.
 *
 * A slot and not a text prop: this is where the off-curve screen puts an `<Alert>`
 * with whatever blocks the action, or a `<Checkbox>` saying "também arquivar os arquivos".
 */
export function ConfirmDialogDescription(
  props: React.ComponentProps<typeof AlertDialogDescription>,
): React.JSX.Element {
  return (
    <AlertDialogDescription data-slot="confirm-dialog-description" {...props} />
  )
}
