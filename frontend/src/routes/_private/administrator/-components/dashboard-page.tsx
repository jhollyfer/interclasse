import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarBlankIcon,
  CardsIcon,
  TrophyIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'

import {
  MatchCardsDialog,
  MatchScheduleDialog,
  MatchScoreDialog,
} from '#/components/common/match-dialogs'
import type { MatchRef } from '#/components/common/match-dialogs'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  bracketsQueryOptions,
  enrollmentRemovalsQueryOptions,
  matchesQueryOptions,
} from '#/integrations/tanstack-query/queries/administrator'
import type { IMatch } from '#/lib/interfaces'
import {
  BRACKET_STATUS_LABELS,
  BRACKET_STATUS_VARIANTS,
  CATEGORY_SHORT_LABELS,
  MATCH_PHASE_LABELS,
  formatWhen,
  plural,
} from '#/lib/labels'

import {
  DASHBOARD_BRACKETS,
  DASHBOARD_MATCHES,
  DASHBOARD_REMOVALS,
} from '../index'

/** A partida no formato que os diálogos esperam: nomes já resolvidos. */
function toRef(match: IMatch): MatchRef {
  return {
    ...match,
    homeName: match.homeTeam?.classroom.name ?? null,
    awayName: match.awayTeam?.classroom.name ?? null,
  }
}

export function DashboardPage(): React.JSX.Element {
  const { data: matches } = useQuery(matchesQueryOptions(DASHBOARD_MATCHES))
  const { data: brackets } = useQuery(bracketsQueryOptions(DASHBOARD_BRACKETS))
  const { data: removals } = useQuery(
    enrollmentRemovalsQueryOptions(DASHBOARD_REMOVALS),
  )
  const [scoring, setScoring] = React.useState<MatchRef | null>(null)
  const [scheduling, setScheduling] = React.useState<MatchRef | null>(null)
  const [carding, setCarding] = React.useState<MatchRef | null>(null)

  const pendingRemovals = removals?.meta.total ?? 0
  const toPlay = matches?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>Painel</PageHeaderTitle>
        <PageHeaderDescription>
          Lance o resultado de cada jogo: o vencedor passa para a fase seguinte
          e o perdedor está fora.
        </PageHeaderDescription>
      </PageHeader>

      {pendingRemovals > 0 && (
        <Link
          to="/administrator/removals"
          className="border-primary bg-primary/10 flex items-center gap-3 rounded-lg border p-4 text-sm"
        >
          <WarningCircleIcon className="text-primary size-6" weight="fill" />
          <span className="flex-1">
            {`${plural(pendingRemovals, 'atleta foi tirado', 'atletas foram tirados')} de modalidade pelos conselheiros. Veja o motivo.`}
          </span>
          <span className="font-medium underline">Ver avisos</span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{`Jogos para lançar resultado (${toPlay.length})`}</CardTitle>
          </CardHeader>
          <CardContent>
            {toPlay.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhum jogo esperando resultado. Sorteie uma chave para criar os
                jogos.
              </p>
            )}
            <ul className="divide-y">
              {toPlay.map((match) => (
                <li
                  key={match.id}
                  className="flex flex-wrap items-center gap-2 py-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">
                      {`${match.homeTeam?.classroom.name ?? 'A definir'} x ${match.awayTeam?.classroom.name ?? 'A definir'}`}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {`${match.bracket?.sport?.name ?? ''} ${CATEGORY_SHORT_LABELS[match.bracket?.category ?? ''] ?? ''} · ${MATCH_PHASE_LABELS[match.phase] ?? match.phase} · ${formatWhen(match.scheduledAt)}`}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => setScoring(toRef(match))}>
                    <TrophyIcon />
                    Resultado
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setScheduling(toRef(match))}
                  >
                    <CalendarBlankIcon />
                    Agendar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCarding(toRef(match))}
                  >
                    <CardsIcon />
                    Cartões
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chaves</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(brackets?.data ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhuma chave sorteada.
              </p>
            )}
            {(brackets?.data ?? []).map((bracket) => (
              <Link
                key={bracket.id}
                to="/administrator/brackets/$id"
                params={{ id: bracket.id }}
                className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <span className="flex-1">
                  {`${bracket.sport?.name ?? ''} · ${CATEGORY_SHORT_LABELS[bracket.category] ?? ''}`}
                </span>
                <Badge variant={BRACKET_STATUS_VARIANTS[bracket.status]}>
                  {BRACKET_STATUS_LABELS[bracket.status]}
                </Badge>
              </Link>
            ))}
            <Link
              to="/administrator/brackets"
              className={buttonVariants({
                variant: 'outline',
                className: 'mt-2',
              })}
            >
              Sortear nova chave
            </Link>
          </CardContent>
        </Card>
      </div>

      {scoring && (
        <MatchScoreDialog
          key={scoring.id}
          match={scoring}
          open
          onOpenChange={() => setScoring(null)}
        />
      )}
      {scheduling && (
        <MatchScheduleDialog
          key={scheduling.id}
          match={scheduling}
          open
          onOpenChange={() => setScheduling(null)}
        />
      )}
      {carding && (
        <MatchCardsDialog
          key={carding.id}
          match={carding}
          open
          onOpenChange={() => setCarding(null)}
        />
      )}
    </div>
  )
}
