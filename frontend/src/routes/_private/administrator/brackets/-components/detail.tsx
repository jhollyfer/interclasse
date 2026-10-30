import {
  ArrowCounterClockwiseIcon,
  CalendarBlankIcon,
  CardsIcon,
  TrashIcon,
  TrophyIcon,
} from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'

import { BracketTree } from '#/components/common/bracket-tree'
import type { BracketMatch } from '#/components/common/bracket-tree'
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
  MatchCardsDialog,
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
import { Card, CardContent } from '#/components/ui/card'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useBracketDeleteMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { bracketQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { createConfirmHandle, createDialogHandle } from '#/lib/dialog-handle'
import { notifyError } from '#/lib/form-errors'
import {
  BRACKET_STATUS_LABELS,
  BRACKET_STATUS_VARIANTS,
  CATEGORY_LABELS,
  championName,
} from '#/lib/labels'
import { m } from '#/paraglide/messages'

const route = getRouteApi('/_private/administrator/brackets/$id/')

/** Partida sem placar pede o botão cheio; com placar, só a correção. */
const SCORE_BUTTON: Record<string, 'default' | 'outline'> = {
  SCHEDULED: 'default',
  FINISHED: 'outline',
}

const UNSCORE_TITLE: Record<string, (() => string) | undefined> = {
  true: () => m.admin_brackets_unscore_locked(),
  false: () => m.admin_common_undo_score(),
}

/**
 * A partida que recebe o vencedor desta. Desfazer o placar só vale enquanto
 * ela não foi jogada: o servidor recusa com `NEXT_MATCH_PLAYED`, e o botão já
 * diz isso antes, em vez de dar erro.
 */
function nextOf(
  matches: ReadonlyArray<BracketMatch>,
  match: BracketMatch,
): BracketMatch | undefined {
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
  const [scoreHandle] = React.useState(() => createDialogHandle<MatchRef>())
  const [scheduleHandle] = React.useState(() => createDialogHandle<MatchRef>())
  const [unscoreHandle] = React.useState(() => createConfirmHandle<MatchRef>())
  const [cardsHandle] = React.useState(() => createDialogHandle<MatchRef>())

  const invalidate = () => invalidateKeys([...GAME_KEYS, ...DEPENDENTS.games])

  const remove = useBracketDeleteMutation({
    onSuccess: async () => {
      toast.success(m.admin_brackets_deleted())
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
          {m.admin_common_sport_category({
            sport: bracket.sport.name,
            category: CATEGORY_LABELS[bracket.category] ?? bracket.category,
          })}
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
            render={
              <Button variant="destructive">
                <TrashIcon />
                {m.admin_brackets_delete_trigger()}
              </Button>
            }
          >
            {hasResults && (
              <React.Fragment>
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>
                    {m.admin_brackets_has_results_title()}
                  </ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    {m.admin_brackets_has_results_description()}
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel>
                    {m.admin_brackets_understood()}
                  </ConfirmDialogCancel>
                </ConfirmDialogFooter>
              </React.Fragment>
            )}
            {!hasResults && (
              <React.Fragment>
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>
                    {m.admin_brackets_delete_title()}
                  </ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    {m.admin_brackets_delete_description()}
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel />
                  <ConfirmDialogConfirm>
                    {m.admin_brackets_delete_trigger()}
                  </ConfirmDialogConfirm>
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
            {m.admin_brackets_champion({ name: champion })}
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-sm">{m.admin_brackets_help()}</p>

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
                title={
                  (!ready && m.admin_brackets_waiting_teams()) || undefined
                }
                onClick={() => scoreHandle.openWithPayload(match)}
              >
                {m.admin_brackets_score()}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => scheduleHandle.openWithPayload(match)}
              >
                <CalendarBlankIcon />
                {m.admin_common_schedule()}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!ready}
                onClick={() => cardsHandle.openWithPayload(match)}
              >
                <CardsIcon />
                {m.admin_common_cards()}
              </Button>
              {match.status === 'FINISHED' && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={locked}
                  title={UNSCORE_TITLE[String(locked)]?.()}
                  onClick={() => unscoreHandle.openWithPayload(match)}
                >
                  <ArrowCounterClockwiseIcon />
                  {m.admin_brackets_undo()}
                </Button>
              )}
            </div>
          )
        }}
      />

      <MatchScoreDialog handle={scoreHandle} />
      <MatchUnscoreDialog handle={unscoreHandle} />
      <MatchCardsDialog handle={cardsHandle} />
      <MatchScheduleDialog handle={scheduleHandle} />
    </div>
  )
}
