import type * as React from 'react'
import type { AdministratorMatchPaginateResponse } from '@interclasse/shared'

import { CATEGORY_LABELS, formatWhen } from '#/lib/labels'
import { phaseLabel, scoreOf } from '#/components/common/match-agenda'
import { m } from '#/paraglide/messages'

/**
 * O placar do herói: o próximo jogo, ou o último resultado quando não há jogo
 * marcado. É dado real da API, e não ilustração - o herói mostra o que o site
 * é, uma tabela de jogos.
 */
export function NextMatch({
  next,
  last,
}: Readonly<{
  next?: AdministratorMatchPaginateResponse
  last?: AdministratorMatchPaginateResponse
}>): React.JSX.Element {
  const match = next ?? last

  if (!match) {
    return (
      <div className="rounded-lg border border-brand-ink-foreground/15 bg-brand-ink-shade/20 p-6 text-brand-ink-foreground/80">
        <p className="font-display text-2xl font-extrabold uppercase italic text-brand-ink-foreground">
          {m.public_next_match_soon_title()}
        </p>
        <p className="mt-2">{m.public_next_match_soon_body()}</p>
      </div>
    )
  }

  let title = m.public_next_match_next()
  if (!next) title = m.public_next_match_last()

  let when = formatWhen(match.scheduledAt)
  if (match.location)
    when = m.common_match_when_location({ when, location: match.location })

  return (
    <div className="rounded-lg border border-brand-ink-foreground/15 bg-brand-ink-shade/25 p-6 text-brand-ink-foreground">
      <p className="text-brand font-semibold">{title}</p>
      <p className="mt-1 text-sm text-brand-ink-foreground/70">
        {m.common_match_context({
          sport: match.bracket.sport.name,
          category:
            CATEGORY_LABELS[match.bracket.category] ?? match.bracket.category,
          phase: phaseLabel(match),
        })}
      </p>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <span className="font-display truncate text-right text-3xl font-extrabold uppercase italic sm:text-4xl">
          {match.homeTeam.classroom.name}
        </span>
        <span className="scoreboard rounded-md px-4 py-1 text-3xl tabular-nums sm:text-4xl">
          {scoreOf(match)}
        </span>
        <span className="font-display truncate text-3xl font-extrabold uppercase italic sm:text-4xl">
          {match.awayTeam.classroom.name}
        </span>
      </div>

      <p className="mt-6 text-sm text-brand-ink-foreground/70">{when}</p>
    </div>
  )
}
