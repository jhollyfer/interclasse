import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'

import { EmptyNote } from '#/components/common/empty-note'
import { Agenda } from '#/components/common/match-agenda'
import { Skeleton } from '#/components/ui/skeleton'
import { storefrontMatchesQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

/**
 * The classroom's matches, scheduled and already played, in schedule order. From the
 * site's route: the match table is public, and the same query serves both roles.
 */
export function ClassroomMatches({
  classroomId,
}: Readonly<{ classroomId: string }>): React.JSX.Element {
  const { data, isPending } = useQuery(
    storefrontMatchesQueryOptions({ classroomId, perPage: 100 }),
  )

  if (isPending) return <Skeleton className="h-40 w-full" />

  if (!data || data.data.length === 0)
    return <EmptyNote>{m.common_classroom_no_matches()}</EmptyNote>

  return <Agenda matches={data.data} />
}
