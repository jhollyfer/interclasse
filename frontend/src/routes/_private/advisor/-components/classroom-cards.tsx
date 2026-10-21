import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'

import { CardList } from '#/components/common/card-list'
import { advisorCardsQueryOptions } from '#/integrations/tanstack-query/queries'

/** Os cartões que os atletas da turma levaram. Só leitura: quem lança é a organização. */
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
      empty="Nenhum atleta da turma levou cartão."
    />
  )
}
