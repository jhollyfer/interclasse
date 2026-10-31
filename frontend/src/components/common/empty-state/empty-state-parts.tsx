import type * as React from 'react'

import {
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from '#/components/ui/empty'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { useEmptyStateContext } from './empty-state-context'

/** The title the component writes when the reason is not a true empty list. */
const OWN_TITLES = {
  filtered: () => m.table_empty_filtered_title(),
  trash: () => m.table_empty_trash_title(),
}

/** The empty title. Filter and trash have their own and ignore the screen's. */
export function EmptyStateTitle({
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  const { reason } = useEmptyStateContext('EmptyStateTitle')

  return (
    <EmptyTitle data-slot="empty-state-title" {...props}>
      {reason === 'empty' && children}
      {reason !== 'empty' && OWN_TITLES[reason]()}
    </EmptyTitle>
  )
}

/**
 * The empty description.
 *
 * The trash keeps the screen's - it explains the resource, and that holds the same with
 * an empty trash. Only the filter swaps, because there the text must say what to do
 * next.
 */
export function EmptyStateDescription({
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  const { reason } = useEmptyStateContext('EmptyStateDescription')

  return (
    <EmptyDescription data-slot="empty-state-description" {...props}>
      {reason === 'filtered' && m.table_empty_filtered_description()}
      {reason !== 'filtered' && children}
    </EmptyDescription>
  )
}

/**
 * The action offered in the empty list - usually the create button.
 *
 * Only on a true empty: telling someone looking at the trash or at a filter with no
 * results to register something is offering the wrong exit.
 */
export function EmptyStateActions({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element | null {
  const { reason } = useEmptyStateContext('EmptyStateActions')

  if (reason !== 'empty') return null

  return (
    <EmptyContent
      data-slot="empty-state-actions"
      className={cn('mt-3', className)}
      {...props}
    />
  )
}
