import * as React from 'react'

/**
 * Why the list is empty. There are three and the text cannot be the same: "nothing
 * registered" on a search with no results tells the person to register what already
 * exists, and on an empty trash suggests the whole resource vanished.
 */
export type EmptyStateReason = 'empty' | 'filtered' | 'trash'

export type EmptyStateContextValue = {
  reason: EmptyStateReason
}

const EmptyStateContext = React.createContext<EmptyStateContextValue | null>(
  null,
)

export const EmptyStateProvider = EmptyStateContext.Provider

/**
 * The reason, for whoever is inside `EmptyState`.
 *
 * The `consumer` goes into the message so the error says **which** part was left outside the
 * provider.
 */
export function useEmptyStateContext(consumer: string): EmptyStateContextValue {
  const context = React.use(EmptyStateContext)

  if (!context) {
    throw new Error(`\`${consumer}\` must be used within \`EmptyState\``)
  }

  return context
}
