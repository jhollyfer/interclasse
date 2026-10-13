import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { TrophyIcon } from '@phosphor-icons/react'

import { storefrontBracketQueryOptions } from '#/integrations/tanstack-query/queries'
import type { IBracketMatch } from '#/lib/interfaces'
import { MATCH_STATUS } from '#/lib/entity'
import {
  CATEGORY_LABELS,
  MATCH_PHASE_LABELS,
  championName,
  formatWhen,
} from '#/lib/labels'
import { cn } from '#/lib/utils'

import { Section } from '../../../-components/section'

const route = getRouteApi('/_public/classificacao/$id/')

/** Uma linha de jogo da chave: os dois times, o vencedor em destaque. */
function Row({ match }: { match: IBracketMatch }): React.JSX.Element {
  const finished = match.status === MATCH_STATUS.FINISHED
  const homeLost = finished && match.winnerTeamId === match.awayTeamId
  const awayLost = finished && match.winnerTeamId === match.homeTeamId

  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      <span
        className={cn(
          'truncate text-right font-medium',
          homeLost && 'text-muted-foreground',
        )}
      >
        {match.homeName ?? 'A definir'}
      </span>
      {/* A caixa de placar é só para resultado: com a data dentro, jogo por
          disputar parecia jogo encerrado. */}
      {finished && (
        <span className="scoreboard rounded px-2 py-0.5 text-sm tabular-nums">
          {match.homeScore} x {match.awayScore}
        </span>
      )}
      {!finished && (
        <span className="text-muted-foreground text-center text-xs">
          {formatWhen(match.scheduledAt)}
        </span>
      )}
      <span
        className={cn(
          'truncate font-medium',
          awayLost && 'text-muted-foreground',
        )}
      >
        {match.awayName ?? 'A definir'}
      </span>
    </li>
  )
}

export function BracketPage(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: bracket } = useSuspenseQuery(storefrontBracketQueryOptions(id))

  const champion = championName(bracket)
  const ordered = [...bracket.matches].sort(
    (a, b) => a.round - b.round || a.position - b.position,
  )
  const phases = [...new Set(ordered.map((match) => match.phase))]

  return (
    <Section
      as="h1"
      title={`${bracket.sport.name} · ${CATEGORY_LABELS[bracket.category]}`}
    >
      {champion && (
        <p className="bg-accent text-accent-foreground flex items-center gap-3 rounded-lg p-4 text-lg font-extrabold uppercase italic">
          <TrophyIcon className="size-7" weight="fill" />
          Campeã: {champion}
        </p>
      )}

      <p className="text-muted-foreground text-sm">
        Mata-mata: quem vence avança, quem perde está fora. Empate se decide nos
        pênaltis.
      </p>

      <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
        {phases.map((phase) => (
          <div key={phase} className="bg-card rounded-lg border p-4">
            <h2 className="font-display mb-2 text-xl font-extrabold uppercase italic">
              {MATCH_PHASE_LABELS[phase]}
            </h2>
            <ul className="divide-y text-sm">
              {ordered
                .filter((match) => match.phase === phase)
                .map((match) => (
                  <Row key={match.id} match={match} />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}
