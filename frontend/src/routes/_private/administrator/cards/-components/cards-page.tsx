import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'
import { toast } from 'sonner'

import { CardList } from '#/components/common/card-list'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useCardDeleteMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { cardsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { notifyError } from '#/lib/form-errors'
import { m } from '#/paraglide/messages'

import { ADMINISTRATOR_CARDS } from '../index'

/**
 * Os cartões de todo o campeonato. Lança-se pela partida (na chave ou na lista
 * de partidas); aqui se consulta e se apaga o lançado por engano.
 */
export function CardsPage(): React.JSX.Element {
  const invalidate = useInvalidate()
  const { data, isPending } = useQuery(cardsQueryOptions(ADMINISTRATOR_CARDS))
  const cards = data?.data ?? []
  const red = cards.filter((card) => card.color === 'RED').length

  const remove = useCardDeleteMutation({
    onSuccess: async () => {
      toast.success(m.admin_cards_deleted())
      await invalidate(GAME_KEYS)
    },
    onError: (error) => notifyError(error, { id: 'card-delete' }),
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>{m.admin_cards_title()}</PageHeaderTitle>
        <PageHeaderDescription>
          {m.admin_cards_summary({ cards: cards.length, red })}
        </PageHeaderDescription>
      </PageHeader>

      <CardList
        cards={cards}
        isPending={isPending}
        empty={m.admin_cards_empty()}
        onDelete={(card) => remove.mutate(card.id)}
      />
    </div>
  )
}
