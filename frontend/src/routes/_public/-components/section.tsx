import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import type { Merge } from '@interclasse/shared'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import type * as React from 'react'

import { cn } from '#/lib/cn'

/**
 * Uma seção do site. Compound sem contexto (`frontend.md` §6.1): as partes não
 * compartilham estado, só se compõem - título, o "ver tudo" opcional e o
 * conteúdo.
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
 * O título, em itálico esportivo. `h2` por padrão; a seção que é a página
 * inteira troca a tag pela prop `render` do Base UI (`render={<h1 />}`) - na
 * home o `h1` é o do herói.
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

/** O "ver tudo" da seção: navegação, então `Link`. */
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

/** O estado vazio de uma seção: o que ainda não aconteceu, dito sem drama. */
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
