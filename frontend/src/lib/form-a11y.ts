/**
 * The pair that links the error to the field (`frontend.md` §10.3): the message's `id` and the
 * control's attributes. An error in color alone does not exist; the screen reader announces the
 * text through `aria-describedby`.
 * _doc-lib/react-hook-form.md#advanced-usage#AccessibilityA11y.
 */

/** The `id` of the error message for the field with the given `id`. */
export function errorId(id: string): string {
  return `${id}-error`
}

type InvalidProps = Readonly<{
  'aria-invalid': boolean
  /** Present only with an error: pointing at a message that does not exist confuses the screen reader. */
  'aria-describedby'?: string
}>

/** What the control spreads to declare itself invalid and point at the error. */
export function invalidProps(invalid: boolean, id: string): InvalidProps {
  if (!invalid) return { 'aria-invalid': false }

  return { 'aria-invalid': true, 'aria-describedby': errorId(id) }
}
