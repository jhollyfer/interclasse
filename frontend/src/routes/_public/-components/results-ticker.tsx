import type { AdministratorMatchPaginateResponse } from '@interclasse/shared'
import type * as React from 'react'

import { phaseLabel } from '#/components/common/match-agenda'
import { m } from '#/paraglide/messages'

/**
 * A faixa amarela de resultados, a marca do site anterior.
 *
 * É a única marquee da página, e a razão é o conteúdo: resultados chegam ao
 * longo do dia e ninguém precisa parar em cada um. A lista vai duplicada para
 * o laço não ter emenda; a cópia fica fora da árvore de acessibilidade. Com
 * movimento reduzido a faixa para e vira rolagem lateral.
 */
export function ResultsTicker({
  matches,
}: Readonly<{
  matches: ReadonlyArray<AdministratorMatchPaginateResponse>
}>): React.JSX.Element | null {
  if (matches.length === 0) return null

  const items = matches.map((match) => (
    <li key={match.id} className="flex shrink-0 items-center gap-2 px-6">
      <span className="font-semibold">{match.bracket.sport.name}</span>
      <span className="font-display text-lg font-extrabold uppercase italic">
        {match.homeTeam.classroom.name} {match.homeScore} x {match.awayScore}{' '}
        {match.awayTeam.classroom.name}
      </span>
      <span className="text-brand-ink/70 text-sm">{phaseLabel(match)}</span>
    </li>
  ))

  return (
    // Região rolável: precisa de região nomeada e foco de teclado para quem
    // não usa o mouse (WCAG 2.1.1).
    <div
      role="region"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável precisa de foco de teclado (axe scrollable-region-focusable, WCAG 2.1.1)
      tabIndex={0}
      className="ticker bg-brand text-brand-ink overflow-x-auto"
      aria-label={m.public_ticker_label()}
    >
      <div className="ticker-track flex w-max py-2.5">
        <ul className="flex">{items}</ul>
        <ul className="flex" aria-hidden>
          {items}
        </ul>
      </div>
    </div>
  )
}
