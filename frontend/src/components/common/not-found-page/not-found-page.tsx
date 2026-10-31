import type { Merge } from '@interclasse/shared'
import { TrophyIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import * as React from 'react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

type NotFoundPageProps = Readonly<
  Merge<
    Omit<React.ComponentProps<'div'>, 'code'>,
    {
      /**
       * The giant number on the dark panel. `404` by default because that is what the
       * page was born for; the router's error boundary passes `500`, and without
       * this parameter it would announce "404" for a server failure.
       */
      code?: React.ReactNode
    }
  >
>

/**
 * The exit page: route not found, and also unhandled error.
 *
 * Without children, it writes the generic 404. A screen that knows **what** was not
 * found swaps the parts it wants and leaves the rest - the passport says the
 * code has ten characters, and that did not fit in a text prop without becoming
 * one more text prop for the other four.
 *
 * The default title used to be "Ops!". Besides being the cliché that the art direction bans
 * by name, it spent the screen's heaviest line saying nothing: whoever
 * lands here already knows something went wrong, and what they need to know is **what**.
 */
export function NotFoundPage({
  className,
  code = '404',
  children,
  ...props
}: NotFoundPageProps): React.JSX.Element {
  return (
    <div
      data-slot="not-found-page"
      className={cn('grid min-h-stage grid-cols-1 md:grid-cols-2', className)}
      {...props}
    >
      <div className="flex flex-col justify-center bg-background px-8 py-12 md:px-16">
        {children ?? (
          <>
            <NotFoundPageTitle>{m.common_not_found_title()}</NotFoundPageTitle>
            <NotFoundPageSubtitle>
              {m.common_not_found_subtitle()}
            </NotFoundPageSubtitle>
            <NotFoundPageDescription>
              {m.common_not_found_description()}
            </NotFoundPageDescription>
            <NotFoundPageActions>
              <NotFoundPageHomeButton />
            </NotFoundPageActions>
          </>
        )}
      </div>

      {/* The site's scoreboard, not a generic black panel: the trophy on top,
          the code below, neither covering the other. */}
      <div className="hero relative flex h-stage-half flex-col items-center justify-center gap-4 overflow-hidden text-brand-ink-foreground md:h-auto md:rounded-l-3xl">
        <TrophyIcon className="text-brand size-16 md:size-20" weight="fill" />
        <span className="font-display text-brand text-error-code leading-none font-extrabold italic select-none md:text-error-code-lg">
          {code}
        </span>
      </div>
    </div>
  )
}

export function NotFoundPageTitle({
  className,
  children,
  ...props
}: React.ComponentProps<'h1'>): React.JSX.Element {
  return (
    <h1
      data-slot="not-found-page-title"
      className={cn(
        'text-4xl font-bold text-foreground md:text-5xl',
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function NotFoundPageSubtitle({
  className,
  ...props
}: React.ComponentProps<'p'>): React.JSX.Element {
  return (
    <p
      data-slot="not-found-page-subtitle"
      className={cn(
        'mt-2 text-xl font-semibold text-foreground md:text-2xl',
        className,
      )}
      {...props}
    />
  )
}

export function NotFoundPageDescription({
  className,
  ...props
}: React.ComponentProps<'p'>): React.JSX.Element {
  return (
    <p
      data-slot="not-found-page-description"
      className={cn('mt-4 max-w-md text-muted-foreground', className)}
      {...props}
    />
  )
}

export function NotFoundPageActions({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element | null {
  if (!children) return null

  return (
    // `div` with `gap`, and not `ButtonGroup`: the group glues its direct children, and
    // these are independent exits - "voltar ao início" and "tentar de novo" do not
    // form a segmented control.
    <div
      data-slot="not-found-page-actions"
      className={cn('mt-8 flex flex-wrap items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * The default exit: back to the start.
 *
 * `to` stays a prop - it is a navigation destination, not markup - and as a `Link` the button
 * responds to open in a new tab, to middle click and to the context menu.
 */
export function NotFoundPageHomeButton({
  to = '/',
  children = m.common_back_home(),
}: Readonly<{
  to?: string
  children?: React.ReactNode
}>): React.JSX.Element {
  return (
    <Button
      data-slot="not-found-page-home-button"
      size="lg"
      className="w-fit"
      render={<Link to={to}>{children}</Link>}
    />
  )
}
