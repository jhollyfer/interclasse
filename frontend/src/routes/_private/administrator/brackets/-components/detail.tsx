import * as React from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowCounterClockwiseIcon,
  CalendarBlankIcon,
  CardsIcon,
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
import { BracketTree } from '#/components/common/bracket-tree'
import {
  MatchCardsDialog,
  MatchScheduleDialog,
  MatchUnscoreDialog,
  MatchScoreDialog,
} from '#/components/common/match-dialogs'
import type { MatchRef } from '#/components/common/match-dialogs'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { notifyError } from '#/lib/form-errors'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderBack,
  PageHeaderBadges,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useBracketDelete } from '#/integrations/tanstack-query/mutations/administrator'
import { bracketQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import type { IBracketMatch } from '#/lib/interfaces'
import {
  BRACKET_STATUS_LABELS,
  BRACKET_STATUS_VARIANTS,
  CATEGORY_LABELS,
  championName,
} from '#/lib/labels'

const route = getRouteApi('/_private/administrator/brackets/$id/')

/** Partida sem placar pede o botão cheio; com placar, só a correção. */
const SCORE_BUTTON: Record<string, 'default' | 'outline'> = {
  SCHEDULED: 'default',
  FINISHED: 'outline',
}

const UNSCORE_TITLE: Record<string, string> = {
  true: 'A partida seguinte já tem placar: desfaça-a antes',
  false: 'Desfazer placar',
}

/**
 * A partida que recebe o vencedor desta. Desfazer o placar só vale enquanto
 * ela não foi jogada: o servidor recusa com `NEXT_MATCH_PLAYED`, e o botão já
 * diz isso antes, em vez de dar erro.
 */
function nextOf(
  matches: ReadonlyArray<IBracketMatch>,
  match: IBracketMatch,
): IBracketMatch | undefined {
  return matches.find(
    (item) =>
      item.round === match.round + 1 &&
      item.position === Math.floor(match.position / 2),
  )
}

export function BracketDetailView(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: bracket } = useSuspenseQuery(bracketQueryOptions(id))
  const invalidateKeys = useInvalidate()
  const navigate = useNavigate()
  const [scoring, setScoring] = React.useState<MatchRef | null>(null)
  const [scheduling, setScheduling] = React.useState<MatchRef | null>(null)
  const [unscoring, setUnscoring] = React.useState<MatchRef | null>(null)
  const [carding, setCarding] = React.useState<MatchRef | null>(null)

  const invalidate = () => invalidateKeys([...GAME_KEYS, ...DEPENDENTS.games])

  const remove = useBracketDelete({
    onSuccess: async () => {
      toast.success('Chave apagada. As inscrições reabriram.')
      await invalidate()
      await navigate({ to: '/administrator/brackets' })
    },
    onError: (error) => notifyError(error, { id: 'bracket-delete' }),
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

      <p className="text-muted-foreground text-sm">
        As partidas nascem do sorteio. Lance o placar e o vencedor sobe sozinho
        para a fase seguinte; empate pede quem venceu nos pênaltis.
      </p>

      <BracketTree
        bracket={bracket}
        renderActions={(match) => {
          const ready = Boolean(match.homeTeamId && match.awayTeamId)
          const next = nextOf(bracket.matches, match)
          const locked = next?.status === 'FINISHED'

          return (
            <div className="mt-1 flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={SCORE_BUTTON[match.status]}
                disabled={!ready}
                title={(!ready && 'Esperando os dois times') || undefined}
                onClick={() => setScoring(match)}
              >
                Placar
              </Button>
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
                variant="ghost"
                disabled={!ready}
                onClick={() => setCarding(match)}
              >
                <CardsIcon />
                Cartões
              </Button>
              {match.status === 'FINISHED' && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={locked}
                  title={UNSCORE_TITLE[String(locked)]}
                  onClick={() => setUnscoring(match)}
                >
                  <ArrowCounterClockwiseIcon />
                  Desfazer
                </Button>
              )}
            </div>
          )
        }}
      />

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
      {carding && (
        <MatchCardsDialog
          key={carding.id}
          match={carding}
          open
          onOpenChange={() => setCarding(null)}
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
