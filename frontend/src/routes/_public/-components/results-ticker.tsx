import type { AdministratorMatchPaginateResponse } from '@interclasse/shared'
import type * as React from 'react'

import { phaseLabel } from '#/components/common/match-agenda'
import { m } from '#/paraglide/messages'

/**
 * The yellow results strip, the previous site's trademark.
 *
 * It is a strip that scrolls sideways under the reader's own hand, not a marquee:
 * a marquee cuts the first word at the edge, runs without being asked for and
 * needs a second, hidden copy of the list to loop. Each result snaps to the
 * start, so none is left half cut, and the label stays outside the scroll to say
 * what the strip is.
 */
export function ResultsTicker({
  matches,
}: Readonly<{
  matches: ReadonlyArray<AdministratorMatchPaginateResponse>
}>): React.JSX.Element | null {
  if (matches.length === 0) return null

  return (
    <div className="bg-brand text-brand-ink flex items-stretch">
      <p className="font-display bg-brand-ink text-brand flex shrink-0 items-center px-4 text-sm font-extrabold uppercase italic">
        {m.public_ticker_label()}
      </p>
      {/* A scrollable region needs a name and keyboard focus (WCAG 2.1.1; axe
          scrollable-region-focusable). */}
      <div
        role="region"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region needs keyboard focus (axe scrollable-region-focusable, WCAG 2.1.1)
        tabIndex={0}
        aria-label={m.public_ticker_label()}
        className="min-w-0 flex-1 snap-x snap-proximity overflow-x-auto"
      >
        <ul className="flex w-max py-2.5">
          {matches.map((match) => (
            <li
              key={match.id}
              className="flex shrink-0 snap-start items-center gap-2 px-4"
            >
              <span className="font-semibold">{match.bracket.sport.name}</span>
              <span className="font-display text-lg font-extrabold uppercase italic">
                {match.homeTeam.classroom.name} {match.homeScore} x{' '}
                {match.awayScore} {match.awayTeam.classroom.name}
              </span>
              <span className="text-brand-ink/70 text-sm">
                {phaseLabel(match)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
