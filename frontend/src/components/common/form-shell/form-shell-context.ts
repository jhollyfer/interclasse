import type { LinkProps } from '@tanstack/react-router'
import * as React from 'react'

/**
 * What the whole form shares - and nothing else.
 *
 * The three are born at the top, in `FormShell`, and used three levels down: the
 * `formId` links the fixed header's `Salvar` to the `<form>` that scrolls in the content,
 * and the back destination is the same for the arrow and `Descartar`. Passing them by prop
 * down there would repeat the three in every part, in every dashboard form - and
 * three sources of truth for the same decision.
 *
 * The title is **not** here: it is markup, and markup goes by slot.
 */
export type FormShellContextValue = {
  /**
   * The `<form>` id.
   *
   * `Salvar` lives in the fixed header and the `<form>` in the scrolling content - they are
   * separate branches of the tree, so the button only reaches the form through the
   * `form=` attribute. Without the id, the click submits nothing.
   */
  formId: string
  /** Where the arrow and `Descartar` go back to. Both point to the same place. */
  backTo: LinkProps['to']
  backParams: LinkProps['params']
  /** Is the mutation in flight? Locks `Salvar` and shows the spinner. */
  isPending: boolean
}

const FormShellContext = React.createContext<FormShellContextValue | null>(null)

export const FormShellProvider = FormShellContext.Provider

/**
 * The form's contract, for whoever is inside `FormShell`.
 *
 * The `consumer` goes into the message so the error says **which** part was left outside the
 * provider - without it the `throw` reports "missing provider" and leaves the search to
 * whoever reads the stack.
 */
export function useFormShellContext(consumer: string): FormShellContextValue {
  const context = React.use(FormShellContext)

  if (!context) {
    throw new Error(`\`${consumer}\` must be used within \`FormShell\``)
  }

  return context
}
