import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'

/** Uma seção do site: título em itálico esportivo e, opcional, o "ver tudo". */
export function Section({
  title,
  more,
  as: Heading = 'h2',
  children,
}: Readonly<{
  title: string
  more?: { to: LinkProps['to']; label: string }
  /** `h1` quando a seção é a página inteira; na home o `h1` é o do herói. */
  as?: 'h1' | 'h2'
  children: React.ReactNode
}>): React.JSX.Element {
  return (
    <section className="container mx-auto flex flex-col gap-4 px-4 py-8">
      <header className="flex items-end justify-between gap-4">
        <Heading className="font-display text-3xl font-extrabold uppercase italic">
          {title}
        </Heading>
        {more && (
          <Link
            to={more.to}
            className="text-primary -my-2 inline-block py-2 text-sm font-semibold hover:underline"
          >
            {more.label}
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}

/** O estado vazio de uma seção: o que ainda não aconteceu, dito sem drama. */
export function Empty({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
      {children}
    </p>
  )
}
