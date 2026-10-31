import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import type { Merge } from '@interclasse/shared'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import type * as React from 'react'

import { cn } from '#/lib/cn'

/**
 * A site section. A compound without context (`frontend.md` §6.1): the parts do not
 * share state, they only compose - title, the optional "ver tudo" and the
 * content.
 */
export function Section({
  className,
  ...props
}: Readonly<React.ComponentProps<'section'>>): React.JSX.Element {
  return (
    <section
      data-slot="section"
      className={cn(
        'container mx-auto flex flex-col gap-4 px-4 py-8',
        className,
      )}
      {...props}
    />
  )
}

export function SectionHeader({
  className,
  ...props
}: Readonly<React.ComponentProps<'header'>>): React.JSX.Element {
  return (
    <header
      data-slot="section-header"
      className={cn('flex items-end justify-between gap-4', className)}
      {...props}
    />
  )
}

/**
 * The title, in sporty italics. `h2` by default; a section that is the whole page
 * swaps the tag with Base UI's `render` prop (`render={<h1 />}`) - on the
 * home the `h1` is the hero's.
 */
export function SectionTitle({
  level = 'h2',
  render,
  ...props
}: Readonly<
  Merge<useRender.ComponentProps<'h2'>, { level?: 'h1' | 'h2' }>
>): React.ReactElement {
  return useRender({
    defaultTagName: level,
    render,
    props: {
      ...mergeProps<'h2'>(
        { className: 'font-display text-3xl font-extrabold uppercase italic' },
        props,
      ),
      'data-slot': 'section-title',
    },
  })
}

/** The section's "ver tudo": navigation, so `Link`. */
export function SectionMore({
  to,
  children,
}: Readonly<{
  to: LinkProps['to']
  children: React.ReactNode
}>): React.JSX.Element {
  return (
    <Link
      data-slot="section-more"
      to={to}
      className="text-primary -my-2 inline-block py-2 text-sm font-semibold hover:underline"
    >
      {children}
    </Link>
  )
}

/** A section's empty state: what has not happened yet, said without drama. */
export function Empty({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <p
      data-slot="section-empty"
      className="text-muted-foreground rounded-lg border border-dashed p-6 text-center"
    >
      {children}
    </p>
  )
}
