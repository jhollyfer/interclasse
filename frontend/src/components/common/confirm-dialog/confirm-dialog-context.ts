import * as React from 'react'

/**
 * What the whole confirmation shares - and nothing else.
 *
 * The action and its weight live here because the screen declares them, at the top, and
 * the confirm button uses them, three levels down. Passing them by prop
 * down there would repeat both in every `ConfirmDialogConfirm` of every screen.
 *
 * The text is **not** here: it is markup, and markup goes by slot.
 */
export type ConfirmDialogContextValue = {
  onConfirm: () => void
  /** An irreversible action paints the button red. */
  destructive: boolean
}

const ConfirmDialogContext =
  React.createContext<ConfirmDialogContextValue | null>(null)

export const ConfirmDialogProvider = ConfirmDialogContext.Provider

/**
 * The confirmed action, for whoever is inside `ConfirmDialog`.
 *
 * The `consumer` goes into the message so the error says **which** part was left outside the
 * provider - without it the `throw` reports "missing provider" and leaves the search to
 * whoever reads the stack.
 */
export function useConfirmDialogContext(
  consumer: string,
): ConfirmDialogContextValue {
  const context = React.use(ConfirmDialogContext)

  if (!context) {
    throw new Error(`\`${consumer}\` must be used within \`ConfirmDialog\``)
  }

  return context
}
