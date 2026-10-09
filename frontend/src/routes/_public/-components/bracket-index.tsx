import type * as React from 'react'
import { Link } from '@tanstack/react-router'

import { Empty } from './section'
import { BRACKET_STATUS_LABELS, CATEGORY_LABELS } from '#/lib/labels'
import type { Bracket } from '#/lib/validator'

/**
 * As chaves por modalidade: uma linha por esporte, com as categorias
 * sorteadas ao lado. É como se procura - "como está o futsal do 6º ao 9º?" - e
 * não uma grade de cartões iguais.
 */
export function BracketIndex({
  brackets,
}: {
  brackets: ReadonlyArray<Bracket>
}): React.JSX.Element {
  if (brackets.length === 0)
    return (
      <Empty>
        As chaves aparecem aqui assim que cada modalidade for sorteada.
      </Empty>
    )

  const sports = new Map<string, { name: string; brackets: Array<Bracket> }>()

  for (const bracket of brackets) {
    const sport = sports.get(bracket.sportId) ?? {
      name: bracket.sport?.name ?? '',
      brackets: [],
    }
    sport.brackets.push(bracket)
    sports.set(bracket.sportId, sport)
  }

  return (
    <ul className="divide-y border-y">
      {[...sports.entries()].map(([id, sport]) => (
        <li
          key={id}
          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="font-display text-3xl font-extrabold uppercase italic">
            {sport.name}
          </span>
          <div className="flex flex-wrap gap-2">
            {sport.brackets.map((bracket) => (
              <Link
                key={bracket.id}
                to="/classificacao/$id"
                params={{ id: bracket.id }}
                className="hover:border-primary hover:text-primary flex flex-col rounded-md border px-4 py-2 transition-colors active:scale-[0.98] motion-reduce:transition-none"
              >
                <span className="font-semibold">
                  {CATEGORY_LABELS[bracket.category]}
                </span>
                <span className="text-muted-foreground text-xs">
                  {BRACKET_STATUS_LABELS[bracket.status]}
                </span>
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
