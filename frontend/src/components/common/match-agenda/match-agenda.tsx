import type { AdministratorMatchPaginateResponse } from '@interclasse/shared'
import { MATCH_STATUS } from '@interclasse/shared'
import type * as React from 'react'

import { cn } from '#/lib/cn'
import {
  CATEGORY_SHORT_LABELS,
  MATCH_PHASE_LABELS,
  formatDay,
  formatDayKey,
  formatTime,
} from '#/lib/labels'
import { m } from '#/paraglide/messages'

/** "Quartas", "Semifinal"... */
export function phaseLabel(
  match: Pick<AdministratorMatchPaginateResponse, 'phase'>,
): string {
  return MATCH_PHASE_LABELS[match.phase] ?? match.phase
}

/** The score, or the "x" for those who have not played yet. */
export function scoreOf(match: AdministratorMatchPaginateResponse): string {
  if (match.status === MATCH_STATUS.FINISHED)
    return `${match.homeScore} x ${match.awayScore}`

  return 'x'
}

type Day = {
  key: string
  label: string
  matches: Array<AdministratorMatchPaginateResponse>
}

/**
 * The agenda in days, in the order the API returned. A match without a time goes in
 * a group of its own, at the end.
 */
export function groupByDay(
  matches: ReadonlyArray<AdministratorMatchPaginateResponse>,
): Array<Day> {
  const days = new Map<string, Day>()

  for (const match of matches) {
    let key = 'sem-horario'
    let label: string = m.common_agenda_time_tbd()

    if (match.scheduledAt) {
      key = formatDayKey(match.scheduledAt)
      label = formatDay(match.scheduledAt)
    }

    const day = days.get(key) ?? { key, label, matches: [] }
    day.matches.push(match)
    days.set(key, day)
  }

  return [...days.values()]
}

/**
 * A match in the agenda: the time, the two classrooms with the score in the middle, and below the
 * sport and the venue. A row, and not a card: the agenda is read top to
 * bottom like a championship grid.
 */
export function MatchRow({
  match,
}: Readonly<{ match: AdministratorMatchPaginateResponse }>): React.JSX.Element {
  const finished = match.status === MATCH_STATUS.FINISHED
  const bracket = match.bracket

  const time = formatTime(match.scheduledAt)

  return (
    <li className="grid grid-cols-agenda items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-agenda-wide">
      <span className="font-display text-muted-foreground row-span-2 text-xl font-bold italic tabular-nums sm:row-span-1">
        {time}
      </span>

      <div className="grid grid-cols-versus items-center gap-3">
        <span className="font-display truncate text-right text-lg font-extrabold uppercase italic">
          {match.homeTeam.classroom.name}
        </span>
        <span
          className={cn(
            'font-display rounded-md px-2.5 py-0.5 text-lg font-extrabold italic tabular-nums',
            finished && 'scoreboard',
            !finished && 'text-muted-foreground',
          )}
        >
          {scoreOf(match)}
        </span>
        <span className="font-display truncate text-lg font-extrabold uppercase italic">
          {match.awayTeam.classroom.name}
        </span>
      </div>

      <p className="text-muted-foreground col-start-2 text-sm sm:col-start-3 sm:text-right">
        <span className="text-foreground font-semibold">
          {bracket.sport.name}
        </span>{' '}
        {m.common_match_context_short({
          category: CATEGORY_SHORT_LABELS[bracket.category] ?? bracket.category,
          phase: phaseLabel(match),
        })}
        {match.location && <span className="block">{match.location}</span>}
      </p>
    </li>
  )
}

/** The whole agenda, day by day. */
export function Agenda({
  matches,
}: Readonly<{
  matches: ReadonlyArray<AdministratorMatchPaginateResponse>
}>): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      {groupByDay(matches).map((day) => (
        <section key={day.key} aria-label={day.label}>
          <h3 className="text-primary border-b pb-2 text-sm font-semibold first-letter:uppercase">
            {day.label}
          </h3>
          <ul className="divide-border/60 divide-y">
            {day.matches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
