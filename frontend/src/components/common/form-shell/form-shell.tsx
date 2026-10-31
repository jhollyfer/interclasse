import type { LinkProps } from '@tanstack/react-router'
import * as React from 'react'

import { PageShell } from '#/components/common/page-shell'

import { FormShellProvider } from './form-shell-context'

type FormShellProps = Readonly<{
  formId: string
  backTo: LinkProps['to']
  backParams?: LinkProps['params']
  isPending?: boolean
  children: React.ReactNode
}>

/**
 * The shell of every dashboard create/edit form.
 *
 * Every dashboard form opens with the same ~55 lines: `PageShell`, a
 * fixed header with back/title/discard/save, and the `<form>` in the scrolling
 * content. Only the middle changes. Repeated once per resource, a header tweak
 * becomes one edit per screen - and the next one is born with the previous
 * version's header.
 *
 * Compound and not `title`/`actions` props: screens diverge in the middle and in the
 * header. The news screen puts three field blocks where the testimonial puts
 * one, and one that needs a third button beside `Salvar` writes the button
 * inside `FormShellActions`. With props, each such divergence becomes one more
 * optional prop in here.
 *
 * The `<Card>` is not embedded either - see `FormShellCard`.
 */
export function FormShell({
  formId,
  backTo,
  backParams,
  isPending = false,
  children,
}: FormShellProps): React.JSX.Element {
  // No `useMemo`: the React Compiler memoizes the object by what it reads.
  const value = { formId, backTo, backParams, isPending }

  return (
    <PageShell data-slot="form-shell">
      <FormShellProvider value={value}>{children}</FormShellProvider>
    </PageShell>
  )
}
