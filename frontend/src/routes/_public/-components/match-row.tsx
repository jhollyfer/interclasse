import type * as React from 'react'

import { CATEGORY_SHORT_LABELS, MATCH_PHASE_LABELS } from '#/lib/labels'
import { MATCH_STATUS } from '#/lib/entity'
import { SCHOOL_TIME_ZONE } from '#/lib/constant'
import { cn } from '#/lib/utils'
import type { IMatch } from '#/lib/interfaces'

/*
 * Datas no fuso da escola, nunca no do navegador: o site renderiza no SSR, e a
 * mesma hora em dois fusos diverge na hidratação.
 */
const TIME = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: SCHOOL_TIME_ZONE,
})

const DAY = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: SCHOOL_TIME_ZONE,
})

const DAY_KEY = new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIME_ZONE })

const WHEN = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: SCHOOL_TIME_ZONE,
})

/** "sex., 16/10, 08:30", ou o aviso de que o horário ainda não saiu. */
export function formatWhen(value: string | null): string {
  if (!value) return 'Horário a definir'

  return WHEN.format(new Date(value))
}

/** "Quartas", "Semifinal"... */
export function phaseLabel(match: Pick<IMatch, 'phase'>): string {
  return MATCH_PHASE_LABELS[match.phase] ?? match.phase
}

/** O placar, ou o "x" de quem ainda não jogou. */
export function scoreOf(match: IMatch): string {
  if (match.status === MATCH_STATUS.FINISHED)
    return `${match.homeScore} x ${match.awayScore}`

  return 'x'
}

type Day = { key: string; label: string; matches: Array<IMatch> }

/**
 * A agenda em dias, na ordem em que a API devolveu. Jogo sem horário fica
 * num grupo próprio, no fim.
 */
export function groupByDay(matches: ReadonlyArray<IMatch>): Array<Day> {
  const days = new Map<string, Day>()

  for (const match of matches) {
    let key = 'sem-horario'
    let label = 'Horário a definir'

    if (match.scheduledAt) {
      const date = new Date(match.scheduledAt)
      key = DAY_KEY.format(date)
      label = DAY.format(date)
    }

    const day = days.get(key) ?? { key, label, matches: [] }
    day.matches.push(match)
    days.set(key, day)
  }

  return [...days.values()]
}

/**
 * Um jogo na agenda: a hora, as duas turmas com o placar no meio, e embaixo a
 * modalidade e o local. Linha, e não cartão: a agenda é lida de cima para
 * baixo como a grade de um campeonato.
 */
export function MatchRow({ match }: { match: IMatch }): React.JSX.Element {
  const finished = match.status === MATCH_STATUS.FINISHED
  const bracket = match.bracket

  let time = '--:--'
  if (match.scheduledAt) time = TIME.format(new Date(match.scheduledAt))

  return (
    <li className="grid grid-cols-[3.5rem_1fr] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[4rem_1fr_14rem]">
      <span className="font-display text-muted-foreground row-span-2 text-xl font-bold italic tabular-nums sm:row-span-1">
        {time}
      </span>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="font-display truncate text-right text-lg font-extrabold uppercase italic">
          {match.homeTeam?.classroom.name}
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
          {match.awayTeam?.classroom.name}
        </span>
      </div>

      <p className="text-muted-foreground col-start-2 text-sm sm:col-start-3 sm:text-right">
        <span className="text-foreground font-semibold">
          {bracket?.sport?.name}
        </span>{' '}
        {CATEGORY_SHORT_LABELS[bracket?.category ?? '']}, {phaseLabel(match)}
        {match.location && <span className="block">{match.location}</span>}
      </p>
    </li>
  )
}

/** A agenda inteira, dia por dia. */
export function Agenda({
  matches,
}: {
  matches: ReadonlyArray<IMatch>
}): React.JSX.Element {
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
