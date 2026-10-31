import type { AdministratorMatchPaginateResponse } from '@interclasse/shared'
import type * as React from 'react'

import { phaseLabel } from '#/components/common/match-agenda'
import { m } from '#/paraglide/messages'

/**
 * The yellow results strip, the previous site's trademark.
 *
 * It is the page's only marquee, and the reason is the content: results arrive
 * throughout the day and nobody needs to stop at each one. The list is duplicated so
 * the loop has no seam; the copy stays outside the accessibility tree. With
 * reduced motion the strip stops and becomes side scrolling.
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
    // Scrollable region: it needs a named region and keyboard focus for whoever
    // does not use the mouse (WCAG 2.1.1).
    <div
      role="region"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region needs keyboard focus (axe scrollable-region-focusable, WCAG 2.1.1)
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
