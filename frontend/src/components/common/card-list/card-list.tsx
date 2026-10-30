import { TrashIcon } from '@phosphor-icons/react'
import type * as React from 'react'
import type { AdministratorCardPaginateResponse } from '@interclasse/shared'

import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  CARD_COLOR_CLASSES,
  CARD_COLOR_LABELS,
  CATEGORY_SHORT_LABELS,
  MATCH_PHASE_LABELS,
  formatDate,
} from '#/lib/labels'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

type CardListProps = Readonly<{
  cards: ReadonlyArray<AdministratorCardPaginateResponse>
  isPending?: boolean
  /** O que dizer quando não há cartão. */
  empty: string
  /** Mostra a partida de cada cartão. Fora, quando a lista já é de uma partida só. */
  showMatch?: boolean
  /** Presente, cada linha ganha o botão de apagar. */
  onDelete?: (card: AdministratorCardPaginateResponse) => void
}>

/**
 * A lista de cartões: a cor, o atleta, a turma e a partida.
 *
 * Mora em `common` porque três telas a usam - os cartões do painel, a turma do
 * conselheiro e o diálogo de cartões da partida.
 */
export function CardList({
  cards,
  isPending,
  empty,
  showMatch = true,
  onDelete,
}: CardListProps): React.JSX.Element {
  if (isPending) return <Skeleton className="h-24 w-full" />

  if (cards.length === 0)
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {empty}
      </p>
    )

  return (
    <ul className="divide-y rounded-lg border">
      {cards.map((card) => (
        <li key={card.id} className="flex items-start gap-3 p-3">
          <span
            role="img"
            aria-label={m.common_card_aria({
              color: CARD_COLOR_LABELS[card.color] ?? card.color,
            })}
            className={cn(
              'mt-0.5 h-5 w-3.5 shrink-0 rounded-sm shadow-sm',
              CARD_COLOR_CLASSES[card.color],
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
            <span className="font-medium">
              {card.student.name}
              <span className="text-muted-foreground font-normal">
                {` · ${card.team.classroom.name}`}
              </span>
            </span>
            {showMatch && <MatchLine card={card} />}
            {card.note && (
              <span className="text-muted-foreground">{card.note}</span>
            )}
          </div>
          {onDelete && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={m.common_card_delete_aria({
                name: card.student.name,
              })}
              title={m.common_card_delete()}
              onClick={() => onDelete(card)}
            >
              <TrashIcon />
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

/** A partida do cartão em uma linha: modalidade, fase, confronto e data. */
function MatchLine({
  card,
}: Readonly<{ card: AdministratorCardPaginateResponse }>): React.JSX.Element {
  const { match } = card
  const sport = match.bracket.sport.name
  const category = CATEGORY_SHORT_LABELS[match.bracket.category] ?? ''
  const home = match.homeTeam?.classroom.name ?? m.common_to_be_defined()
  const away = match.awayTeam?.classroom.name ?? m.common_to_be_defined()

  return (
    <span className="text-muted-foreground text-xs">
      {m.common_card_match_line({
        sport,
        category,
        phase: MATCH_PHASE_LABELS[match.phase] ?? match.phase,
        home,
        away,
      })}
      {match.scheduledAt && ` · ${formatDate(match.scheduledAt)}`}
    </span>
  )
}
