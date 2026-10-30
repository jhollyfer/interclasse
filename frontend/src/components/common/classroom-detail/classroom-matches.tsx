import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'

import { Agenda } from '#/components/common/match-agenda'
import { Skeleton } from '#/components/ui/skeleton'
import { storefrontMatchesQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

/**
 * Os jogos da turma, marcados e já jogados, na ordem da agenda. Da rota do
 * site: a tabela de jogos é pública, e a mesma consulta serve aos dois papéis.
 */
export function ClassroomMatches({
  classroomId,
}: Readonly<{ classroomId: string }>): React.JSX.Element {
  const { data, isPending } = useQuery(
    storefrontMatchesQueryOptions({ classroomId, perPage: 100 }),
  )

  if (isPending) return <Skeleton className="h-40 w-full" />

  if (!data || data.data.length === 0)
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        {m.common_classroom_no_matches()}
      </p>
    )

  return <Agenda matches={data.data} />
}
