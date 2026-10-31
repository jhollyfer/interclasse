import type { Merge } from '@interclasse/shared'
import type * as React from 'react'

import { PageShellContent } from '#/components/common/page-shell'
import { Card, CardContent } from '#/components/ui/card'
import { cn } from '#/lib/cn'

import { useFormShellContext } from './form-shell-context'

type FormShellContentProps = Readonly<
  Merge<
    Omit<React.ComponentProps<'form'>, 'children'>,
    { children: React.ReactNode }
  >
>

/**
 * The scrolling content, and the real `<form>`.
 *
 * The `id` comes from the context because `Salvar` lives in the fixed header, outside this
 * tree, and it is through it that the click reaches the form.
 */
export function FormShellContent({
  children,
  className,
  ...props
}: FormShellContentProps): React.JSX.Element {
  const { formId } = useFormShellContext('FormShellContent')

  return (
    <PageShellContent>
      {/* `method="post"`: a click before hydration becomes a native submit, and GET
          would put the fields - password included - in the URL and in the history. */}
      {/* `max-w-3xl`: a text field stretched to 1200px makes the eye cross the
          whole screen to read a name. */}
      <form
        data-slot="form-shell-content"
        method="post"
        id={formId}
        className={cn(
          'mx-auto flex w-full max-w-3xl flex-col gap-4',
          className,
        )}
        {...props}
      >
        {children}
      </form>
    </PageShellContent>
  )
}

type FormShellCardProps = Readonly<
  Merge<
    Omit<React.ComponentProps<typeof CardContent>, 'children'>,
    { children: React.ReactNode }
  >
>

/**
 * A block of fields.
 *
 * `Card` + `CardContent` + the `gap-4` column that every dashboard form
 * wrote by hand. A separate piece and not embedded in `FormShellContent` because the
 * quantity varies: the testimonial screen has one, the news screen has three, and one that
 * needs its own layout uses none. A boolean escape prop would be
 * the same thing with a worse name.
 */
export function FormShellCard({
  className,
  children,
  ...props
}: FormShellCardProps): React.JSX.Element {
  return (
    <Card data-slot="form-shell-card">
      <CardContent className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </CardContent>
    </Card>
  )
}
