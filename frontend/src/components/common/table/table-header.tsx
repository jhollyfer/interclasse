import { PlusIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import type * as React from 'react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/cn'

/**
 * The listing's fixed header: title and description on the left, actions on the right.
 *
 * Slots and not text props because the screens do not agree on what goes
 * here: the testimonials screen creates nothing - they arrive from the storefront -, the
 * news screen creates, and the file library has no description. With a prop,
 * each of these variations becomes one more
 * optional prop in here; with a slot, the screen writes what it has and omits the
 * rest.
 *
 * The two-column grid only exists when there is a `TableActions` - it is the same
 * `has-data-[slot=...]` that `Card` uses, and it is what lets the title take
 * the whole line when the screen has no action at all.
 */
function TableHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="table-header"
      className={cn(
        'grid shrink-0 auto-rows-min items-start gap-1 border-b pb-3 has-data-[slot=table-actions]:grid-cols-title-actions',
        className,
      )}
      {...props}
    />
  )
}

function TableTitle({
  className,
  children,
  ...props
}: React.ComponentProps<'h1'>): React.JSX.Element {
  return (
    <h1
      data-slot="table-title"
      className={cn('text-2xl font-bold', className)}
      {...props}
    >
      {children}
    </h1>
  )
}

/** Disappears when the screen has nothing to explain - not every listing needs one. */
function TableDescription({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element | null {
  if (!children) return null

  return (
    <div
      data-slot="table-description"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * The actions on the right: create, export, whatever the screen has - one, three or
 * none. `flex-wrap` because three buttons do not fit side by side on a phone.
 */
function TableActions({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element | null {
  if (!children) return null

  return (
    <div
      data-slot="table-actions"
      className={cn(
        'col-start-2 row-span-2 row-start-1 flex flex-wrap items-center justify-end gap-2 self-start justify-self-end',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * The create button, for the header and for the empty state.
 *
 * `Link` and not `onClick` with `navigate()`: creating is navigation, and as a link it
 * responds to open in a new tab, to middle click and to the context menu.
 */
function TableCreateButton({
  to,
  children,
}: Readonly<{
  to: string
  children: React.ReactNode
}>): React.JSX.Element {
  return (
    <Button
      type="button"
      render={
        <Link to={to}>
          <PlusIcon />
          {children}
        </Link>
      }
    />
  )
}

export {
  TableActions,
  TableCreateButton,
  TableDescription,
  TableHeader,
  TableTitle,
}
