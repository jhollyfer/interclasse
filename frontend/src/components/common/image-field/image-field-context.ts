import * as React from 'react'

/**
 * What the whole field shares - and nothing else.
 *
 * The upload is a small but real state machine: it uploads on choice, keeps the
 * orphan to delete on replacement, and locks the submit while in flight. The visible
 * parts only read its result. Passing that by prop would force each piece to
 * receive five props that none of them decides.
 *
 * The texts are **not** here: label, fallback initials and description are
 * markup, and markup goes by slot.
 */
export type ImageFieldContextValue = {
  /** The image to show: the freshly uploaded one, or the one already saved. */
  shown: string | null | undefined
  /** Is there anything to remove? Governs whether the remove button appears. */
  hasImage: boolean
  /** Is the file uploading? Locks both buttons and swaps the icon for a spinner. */
  isPending: boolean
  /** Opens the native file picker, which is hidden inside `ImageField`. */
  openPicker: () => void
  /** Points the field at `null` and deletes the orphan, if any. */
  clear: () => void
  /**
   * Goes on the button that opens the picker, so the consumer's `FieldLabel` can
   * point an `htmlFor` at something focusable - the `<input type="file">` is
   * hidden, and a label pointing at a hidden element brings no focus at all.
   */
  controlId: string | undefined
}

const ImageFieldContext = React.createContext<ImageFieldContextValue | null>(
  null,
)

export const ImageFieldProvider = ImageFieldContext.Provider

/**
 * The field, for whoever is inside `ImageField`.
 *
 * The `consumer` goes into the message so the error says **which** part was left outside the
 * provider - without it the `throw` reports "missing provider" and leaves the search to
 * whoever reads the stack.
 */
export function useImageFieldContext(consumer: string): ImageFieldContextValue {
  const context = React.use(ImageFieldContext)

  if (!context) {
    throw new Error(`\`${consumer}\` precisa estar dentro de \`ImageField\``)
  }

  return context
}
