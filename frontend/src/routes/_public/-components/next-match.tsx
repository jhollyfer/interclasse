import type * as React from 'react'

import { CATEGORY_LABELS } from '#/lib/labels'
import type { IMatch } from '#/lib/interfaces'

import { formatWhen, phaseLabel, scoreOf } from './match-row'

/**
 * O placar do herói: o próximo jogo, ou o último resultado quando não há jogo
 * marcado. É dado real da API, e não ilustração - o herói mostra o que o site
 * é, uma tabela de jogos.
 */
export function NextMatch({
  next,
  last,
}: {
  next?: IMatch
  last?: IMatch
}): React.JSX.Element {
  const match = next ?? last

  if (!match) {
    return (
      <div className="rounded-lg border border-white/15 bg-black/20 p-6 text-white/80">
        <p className="font-display text-2xl font-extrabold uppercase italic text-white">
          Sorteio em breve
        </p>
        <p className="mt-2">
          Os jogos aparecem aqui assim que a organização sortear as chaves.
        </p>
      </div>
    )
  }

  let title = 'Próximo jogo'
  if (!next) title = 'Último resultado'

  return (
    <div className="rounded-lg border border-white/15 bg-black/25 p-6 text-white">
      <p className="text-brand font-semibold">{title}</p>
      <p className="mt-1 text-sm text-white/70">
        {match.bracket?.sport?.name},{' '}
        {CATEGORY_LABELS[match.bracket?.category ?? '']}, {phaseLabel(match)}
      </p>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <span className="font-display truncate text-right text-3xl font-extrabold uppercase italic sm:text-4xl">
          {match.homeTeam?.classroom.name}
        </span>
        <span className="scoreboard rounded-md px-4 py-1 text-3xl tabular-nums sm:text-4xl">
          {scoreOf(match)}
        </span>
        <span className="font-display truncate text-3xl font-extrabold uppercase italic sm:text-4xl">
          {match.awayTeam?.classroom.name}
        </span>
      </div>

      <p className="mt-6 text-sm text-white/70">
        {formatWhen(match.scheduledAt)}
        {match.location && `, ${match.location}`}
      </p>
    </div>
  )
}
