import type { Merge } from '@interclasse/shared'
import { Link } from '@tanstack/react-router'
import type * as React from 'react'

import {
  PageHeader,
  PageHeaderActions,
  PageHeaderBack,
  PageHeaderTitle,
  PageShellHeader,
} from '#/components/common/page-shell'
import { SubmitButton } from '#/components/common/submit-button'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'

import { useFormShellContext } from './form-shell-context'

/** The header that does not scroll: back, title and actions. */
export function FormShellHeader({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.JSX.Element {
  return (
    <PageShellHeader>
      {/* Same width and same center as the form: "Salvar" sits over the
          field, and not 1000px away from it on a wide screen. */}
      <PageHeader data-slot="form-shell-header" className="mx-auto max-w-3xl">
        {children}
      </PageHeader>
    </PageShellHeader>
  )
}

/** The back arrow. The destination comes from the context, not from a prop. */
export function FormShellBack(): React.JSX.Element {
  const { backTo, backParams } = useFormShellContext('FormShellBack')

  return (
    <PageHeaderBack
      data-slot="form-shell-back"
      to={backTo}
      params={backParams}
    />
  )
}

export function FormShellTitle(
  props: React.ComponentProps<typeof PageHeaderTitle>,
): React.JSX.Element {
  return <PageHeaderTitle data-slot="form-shell-title" {...props} />
}

/**
 * The actions on the right. Usually `FormShellDiscard` + `FormShellSubmit`, but a
 * screen that needs one more button writes the button in here.
 */
export function FormShellActions(
  props: React.ComponentProps<typeof PageHeaderActions>,
): React.JSX.Element | null {
  return <PageHeaderActions data-slot="form-shell-actions" {...props} />
}

/**
 * The exit without saving.
 *
 * `Link` and not `onClick` with `navigate()`: discarding is navigation, and as a link
 * it responds to open in a new tab, to middle click and to the context menu.
 *
 * Without children it writes "Descartar", which is what every dashboard form says.
 */
export function FormShellDiscard({
  children = m.common_discard(),
  ...rest
}: React.ComponentProps<typeof Button>): React.JSX.Element {
  const { backTo, backParams } = useFormShellContext('FormShellDiscard')

  return (
    <Button
      data-slot="form-shell-discard"
      variant="outline"
      type="button"
      {...rest}
      render={
        <Link to={backTo} params={backParams}>
          {children}
        </Link>
      }
    />
  )
}

// `SubmitButton`'s `children` is required; here it is optional, and
// `Merge` replaces the key instead of intersecting.
type FormShellSubmitProps = Readonly<
  Merge<
    Omit<React.ComponentProps<typeof SubmitButton>, 'children'>,
    { children?: React.ReactNode }
  >
>

/**
 * The button that saves.
 *
 * `form` and `isPending` come from the context: the screen declares them, in
 * `FormShell`, and repeating them here would give two sources of truth for the same
 * decision. Without children it writes "Salvar".
 */
export function FormShellSubmit({
  children = m.common_save(),
  ...rest
}: FormShellSubmitProps): React.JSX.Element {
  const { formId, isPending } = useFormShellContext('FormShellSubmit')

  return (
    <SubmitButton
      data-slot="form-shell-submit"
      form={formId}
      isPending={isPending}
      {...rest}
    >
      {children}
    </SubmitButton>
  )
}
