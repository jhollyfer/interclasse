import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'

import { CardList } from '#/components/common/card-list'
import { advisorCardsQueryOptions } from '#/integrations/tanstack-query/queries/advisor'
import { m } from '#/paraglide/messages'

/** The cards the classroom's athletes received. Read-only: the organization records them. */
export function ClassroomCards({
  classroomId,
}: Readonly<{ classroomId: string }>): React.JSX.Element {
  const { data, isPending } = useQuery(
    advisorCardsQueryOptions({ classroomId, perPage: 100 }),
  )

  return (
    <CardList
      cards={data?.data ?? []}
      isPending={isPending}
      empty={m.common_classroom_no_cards()}
    />
  )
}
