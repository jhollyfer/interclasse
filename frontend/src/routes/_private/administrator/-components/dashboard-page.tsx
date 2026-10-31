import type { AdministratorMatchPaginateResponse } from '@interclasse/shared'
import {
  CalendarBlankIcon,
  CardsIcon,
  TrophyIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import * as React from 'react'

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
import { createDialogHandle } from '#/lib/dialog-handle'
import {
  BRACKET_STATUS_LABELS,
  BRACKET_STATUS_VARIANTS,
  CATEGORY_SHORT_LABELS,
  MATCH_PHASE_LABELS,
  formatWhen,
} from '#/lib/labels'
import { m } from '#/paraglide/messages'

import {
  DASHBOARD_BRACKETS,
  DASHBOARD_MATCHES,
  DASHBOARD_REMOVALS,
} from '../index'

/** The match in the format the dialogs expect: names already resolved. */
function toRef(match: AdministratorMatchPaginateResponse): MatchRef {
  return {
    ...match,
    homeName: match.homeTeam.classroom.name,
    awayName: match.awayTeam.classroom.name,
  }
}

export function DashboardPage(): React.JSX.Element {
  const { data: matches } = useQuery(matchesQueryOptions(DASHBOARD_MATCHES))
  const { data: brackets } = useQuery(bracketsQueryOptions(DASHBOARD_BRACKETS))
  const { data: removals } = useQuery(
    enrollmentRemovalsQueryOptions(DASHBOARD_REMOVALS),
  )
  const [scoreHandle] = React.useState(() => createDialogHandle<MatchRef>())
  const [scheduleHandle] = React.useState(() => createDialogHandle<MatchRef>())
  const [cardsHandle] = React.useState(() => createDialogHandle<MatchRef>())

  const pendingRemovals = removals?.meta.total ?? 0
  const toPlay = matches?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>{m.admin_dashboard_title()}</PageHeaderTitle>
        <PageHeaderDescription>
          {m.admin_dashboard_description()}
        </PageHeaderDescription>
      </PageHeader>

      {pendingRemovals > 0 && (
        <Link
          to="/administrator/removals"
          className="border-primary bg-primary/10 flex items-center gap-3 rounded-lg border p-4 text-sm"
        >
          <WarningCircleIcon className="text-primary size-6" weight="fill" />
          <span className="flex-1">
            {m.admin_dashboard_removals_notice({ count: pendingRemovals })}
          </span>
          <span className="font-medium underline">
            {m.admin_dashboard_removals_link()}
          </span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-dashboard">
        <Card>
          <CardHeader>
            <CardTitle>
              {m.admin_dashboard_matches_title({ count: toPlay.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {toPlay.length === 0 && (
              <p className="text-muted-foreground text-sm">
                {m.admin_dashboard_matches_empty()}
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
                      {m.admin_common_versus({
                        home: match.homeTeam.classroom.name,
                        away: match.awayTeam.classroom.name,
                      })}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {m.admin_dashboard_match_meta({
                        sport: match.bracket.sport.name,
                        category:
                          CATEGORY_SHORT_LABELS[match.bracket.category] ?? '',
                        phase: MATCH_PHASE_LABELS[match.phase] ?? match.phase,
                        when: formatWhen(match.scheduledAt),
                      })}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => scoreHandle.openWithPayload(toRef(match))}
                  >
                    <TrophyIcon />
                    {m.admin_dashboard_result()}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => scheduleHandle.openWithPayload(toRef(match))}
                  >
                    <CalendarBlankIcon />
                    {m.admin_common_schedule()}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cardsHandle.openWithPayload(toRef(match))}
                  >
                    <CardsIcon />
                    {m.admin_common_cards()}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{m.admin_common_brackets()}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(brackets?.data ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm">
                {m.admin_dashboard_brackets_empty()}
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
                  {m.admin_common_sport_category({
                    sport: bracket.sport.name,
                    category: CATEGORY_SHORT_LABELS[bracket.category] ?? '',
                  })}
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
              {m.admin_dashboard_draw_new()}
            </Link>
          </CardContent>
        </Card>
      </div>

      <MatchScoreDialog handle={scoreHandle} />
      <MatchScheduleDialog handle={scheduleHandle} />
      <MatchCardsDialog handle={cardsHandle} />
    </div>
  )
}
