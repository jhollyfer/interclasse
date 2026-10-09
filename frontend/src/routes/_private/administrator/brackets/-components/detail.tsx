import * as React from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowCounterClockwiseIcon,
  CalendarBlankIcon,
  TrashIcon,
  TrophyIcon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

import {
  ConfirmDialog,
  ConfirmDialogDescription,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import {
  MatchScheduleDialog,
  MatchUnscoreDialog,
  MatchScoreDialog,
} from '#/components/common/match-dialogs'
import type { MatchRef } from '#/components/common/match-dialogs'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderBack,
  PageHeaderBadges,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useBracketDelete } from '#/integrations/tanstack-query/mutations'
import { bracketQueryOptions } from '#/integrations/tanstack-query/queries'
import type { BracketMatch } from '#/integrations/response'
import {
  BRACKET_STATUS_LABELS,
  BRACKET_STATUS_VARIANTS,
  CATEGORY_LABELS,
  MATCH_PHASE_LABELS,
  championName,
  formatDate,
} from '#/lib/labels'

const route = getRouteApi('/_private/administrator/brackets/$id/')

/** Partida sem placar pede o botão cheio; com placar, só a correção. */
const SCORE_BUTTON: Record<string, 'default' | 'outline'> = {
  SCHEDULED: 'default',
  FINISHED: 'outline',
}

/** Quem caiu fica apagado: no empate, é o que diz quem passou nos pênaltis. */
function loserClass(match: BracketMatch, teamId: string | null): string {
  if (!match.winnerTeamId || !teamId || match.winnerTeamId === teamId) return ''

  return 'text-muted-foreground line-through decoration-1'
}

/** Agrupa as partidas pela ordem em que acontecem: uma seção por fase. */
function bySection(matches: ReadonlyArray<BracketMatch>) {
  const sections = new Map<string, BracketMatch[]>()
  const ordered = [...matches].sort(
    (a, b) => a.round - b.round || a.position - b.position,
  )

  for (const match of ordered) {
    const key = MATCH_PHASE_LABELS[match.phase] ?? match.phase
    sections.set(key, [...(sections.get(key) ?? []), match])
  }

  return [...sections.entries()]
}

export function BracketDetailView(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: bracket } = useSuspenseQuery(bracketQueryOptions(id))
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [scoring, setScoring] = React.useState<MatchRef | null>(null)
  const [scheduling, setScheduling] = React.useState<MatchRef | null>(null)
  const [unscoring, setUnscoring] = React.useState<MatchRef | null>(null)

  const invalidate = () =>
    Promise.all(
      [queryKeys.games.all, ...DEPENDENTS.games].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    )

  const remove = useBracketDelete({
    onSuccess: async () => {
      toast.success('Chave apagada. As inscrições reabriram.')
      await invalidate()
      await navigate({ to: '/administrator/brackets' })
    },
    onError: (error) => toast.error(error.message, { id: 'bracket-delete' }),
  })

  const champion = championName(bracket)
  // O servidor recusa apagar chave com placar (`BRACKET_HAS_RESULTS`): o alerta
  // já diz isso, em vez de oferecer um "Apagar" que vai dar erro.
  const hasResults = bracket.matches.some(
    (match) => match.status === 'FINISHED',
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderBack to="/administrator/brackets" />
        <PageHeaderTitle>
          {bracket.sport.name} · {CATEGORY_LABELS[bracket.category]}
        </PageHeaderTitle>
        <PageHeaderBadges>
          <Badge variant={BRACKET_STATUS_VARIANTS[bracket.status]}>
            {BRACKET_STATUS_LABELS[bracket.status]}
          </Badge>
        </PageHeaderBadges>
        <PageHeaderActions>
          <ConfirmDialog
            destructive
            onConfirm={() => remove.mutate(bracket.id)}
            trigger={
              <Button variant="destructive">
                <TrashIcon />
                Apagar chave
              </Button>
            }
          >
            {hasResults && (
              <React.Fragment>
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>A chave já tem placar</ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    Apagar levaria embora resultados que aconteceram em quadra.
                    Para refazer o sorteio, desfaça os placares antes, da final
                    para a primeira fase.
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel>Entendi</ConfirmDialogCancel>
                </ConfirmDialogFooter>
              </React.Fragment>
            )}
            {!hasResults && (
              <React.Fragment>
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>Apagar a chave?</ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    Times e partidas somem, e as inscrições da modalidade
                    reabrem. É assim que se refaz um sorteio.
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel />
                  <ConfirmDialogConfirm>Apagar chave</ConfirmDialogConfirm>
                </ConfirmDialogFooter>
              </React.Fragment>
            )}
          </ConfirmDialog>
        </PageHeaderActions>
      </PageHeader>

      {champion && (
        <Card className="border-primary">
          <CardContent className="flex items-center gap-3 font-semibold">
            <TrophyIcon className="text-primary size-6" weight="fill" />
            Campeã: {champion}
          </CardContent>
        </Card>
      )}

      {bySection(bracket.matches).map(([section, matches]) => (
        <Card key={section}>
          <CardHeader>
            <CardTitle>{section}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {matches.map((match) => (
              <div
                key={match.id}
                className="flex flex-wrap items-center gap-3 py-2"
              >
                <span className="text-muted-foreground w-full text-sm sm:w-36">
                  {formatDate(match.scheduledAt)}
                  {match.location && ` · ${match.location}`}
                </span>
                <span className="flex-1 font-medium">
                  <span className={loserClass(match, match.homeTeamId)}>
                    {match.homeName ?? 'A definir'}
                  </span>{' '}
                  <span className="bg-foreground text-background mx-1 rounded px-2 py-0.5 tabular-nums">
                    {match.homeScore ?? '-'} x {match.awayScore ?? '-'}
                  </span>{' '}
                  <span className={loserClass(match, match.awayTeamId)}>
                    {match.awayName ?? 'A definir'}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScheduling(match)}
                >
                  <CalendarBlankIcon />
                  Agendar
                </Button>
                <Button
                  size="sm"
                  variant={SCORE_BUTTON[match.status]}
                  disabled={!match.homeTeamId || !match.awayTeamId}
                  onClick={() => setScoring(match)}
                >
                  Placar
                </Button>
                {match.status === 'FINISHED' && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Desfazer placar"
                    title="Desfazer placar"
                    onClick={() => setUnscoring(match)}
                  >
                    <ArrowCounterClockwiseIcon />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {scoring && (
        <MatchScoreDialog
          key={scoring.id}
          match={scoring}
          open
          onOpenChange={() => setScoring(null)}
        />
      )}
      {unscoring && (
        <MatchUnscoreDialog
          key={unscoring.id}
          match={unscoring}
          open
          onOpenChange={() => setUnscoring(null)}
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
    </div>
  )
}
