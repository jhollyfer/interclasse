import { ArrowClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type * as React from 'react'

import { PageShellContent } from '#/components/common/page-shell'
import { Button } from '#/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { m } from '#/paraglide/messages'

import { useTableContext } from './table-context'

/**
 * The scrolling area: the table, the empty state and the selection bar.
 *
 * The bar sits in here on purpose - `sticky bottom-4` only follows the
 * list if it is in the same container that scrolls.
 *
 * **Error before empty, and in one place.** No listing on the previous dashboard
 * had an error state: the query failed, returned zero rows, and
 * `TableEmpty` announced "nenhum registro ainda" - which is the invitation to register
 * again what already exists, to someone whose only problem was the network. Staying
 * here and not on each screen is what guarantees the next listing is born
 * covered.
 */
export function TableContent({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.JSX.Element {
  const { isError, onRetry } = useTableContext('TableContent')

  if (isError) {
    return (
      <PageShellContent data-slot="table-content">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WarningCircleIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{m.table_load_error_title()}</EmptyTitle>
            <EmptyDescription>
              {m.table_load_error_description()}
            </EmptyDescription>
          </EmptyHeader>

          {/* Without `onRetry` the button does not appear: a "tentar de novo" that redoes
              nothing is worse than no button. */}
          {onRetry && (
            <EmptyContent>
              <Button variant="outline" onClick={onRetry}>
                <ArrowClockwiseIcon aria-hidden />
                {m.common_retry()}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </PageShellContent>
    )
  }

  return <PageShellContent>{children}</PageShellContent>
}
