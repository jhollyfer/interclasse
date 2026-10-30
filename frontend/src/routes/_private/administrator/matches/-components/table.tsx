import type { AdministratorMatchPaginateResponse } from '@interclasse/shared'
import { CATEGORIES, MATCH_STATUSES } from '@interclasse/shared'
import {
  ArrowCounterClockwiseIcon,
  CalendarBlankIcon,
  CardsIcon,
  NumberSquareOneIcon,
  TreeStructureIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import * as React from 'react'

import {
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
} from '#/components/common/empty-state'
import {
  MatchCardsDialog,
  MatchScheduleDialog,
  MatchUnscoreDialog,
  MatchScoreDialog,
} from '#/components/common/match-dialogs'
import type { MatchRef } from '#/components/common/match-dialogs'
import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
import { RowActions } from '#/components/common/row-actions'
import {
  Table,
  TableActions,
  TableContent,
  TableEmpty,
  TableGrid,
  TableHeader,
  TablePagination,
  TableTitle,
  TableToolbar,
  useTable,
} from '#/components/common/table'
import type { TableColumns } from '#/components/common/table'
import { Badge } from '#/components/ui/badge'
import { buttonVariants } from '#/components/ui/button'
import { DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { matchesQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import {
  CATEGORY_SHORT_LABELS,
  CATEGORY_LABELS,
  MATCH_PHASE_LABELS,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_VARIANTS,
  formatDate,
} from '#/lib/labels'
import { m } from '#/paraglide/messages'

const route = getRouteApi('/_private/administrator/matches/')

/** A partida no formato que os diálogos esperam: nomes já resolvidos. */
function toRef(match: AdministratorMatchPaginateResponse): MatchRef {
  return {
    ...match,
    homeName: match.homeTeam.classroom.name,
    awayName: match.awayTeam.classroom.name,
  }
}

function phaseOf(match: AdministratorMatchPaginateResponse): string {
  return MATCH_PHASE_LABELS[match.phase] ?? match.phase
}

function matchColumns(): TableColumns<AdministratorMatchPaginateResponse> {
  return [
    // O jogo primeiro: é o que se procura na lista, e é o que a tabela estreita
    // não pode cortar.
    {
      id: 'game',
      accessorFn: (row) => row.id,
      meta: { label: m.admin_common_match() },
      size: 240,
      header: () => m.admin_common_match(),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.homeTeam.classroom.name}{' '}
          <span className="tabular-nums">
            {row.original.homeScore ?? '-'} x {row.original.awayScore ?? '-'}
          </span>{' '}
          {row.original.awayTeam.classroom.name}
        </span>
      ),
      enableHiding: false,
    },
    {
      id: 'when',
      accessorFn: (row) => row.scheduledAt ?? '',
      meta: { label: m.admin_common_when() },
      size: 150,
      header: () => m.admin_common_when(),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.scheduledAt)}
        </span>
      ),
    },
    {
      id: 'sport',
      accessorFn: (row) => row.bracket.sport.name,
      meta: { label: m.admin_common_sport() },
      size: 170,
      header: () => m.admin_common_sport(),
      cell: ({ row }) => {
        const bracket = row.original.bracket
        return m.admin_common_sport_category({
          sport: bracket.sport.name,
          category: CATEGORY_SHORT_LABELS[bracket.category] ?? '',
        })
      },
    },
    {
      id: 'phase',
      accessorFn: (row) => phaseOf(row),
      meta: { label: m.admin_common_phase() },
      size: 110,
      header: () => m.admin_common_phase(),
      cell: ({ row }) => phaseOf(row.original),
    },
    {
      accessorKey: 'status',
      meta: { label: m.admin_common_status() },
      size: 120,
      header: () => m.admin_common_status(),
      cell: ({ row }) => (
        <Badge variant={MATCH_STATUS_VARIANTS[row.original.status]}>
          {MATCH_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
  ]
}

/**
 * A agenda de todas as chaves numa lista só: é por aqui que se marca horário e
 * se lança placar no dia, sem abrir chave por chave.
 */
export function MatchesTable(): React.JSX.Element {
  const search = route.useSearch()
  const navigate = useNavigate()
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    matchesQueryOptions(search),
  )
  const [scoring, setScoring] = React.useState<MatchRef | null>(null)
  const [scheduling, setScheduling] = React.useState<MatchRef | null>(null)
  const [unscoring, setUnscoring] = React.useState<MatchRef | null>(null)
  const [carding, setCarding] = React.useState<MatchRef | null>(null)

  const columns = matchColumns()

  const table = useTable({
    rows: data?.data ?? [],
    columns,
    getRowId: (row) => row.id,
    persistKey: 'administrator:matches',
    // Menu de linha, como nas outras listas: dois botões não cabem na coluna
    // de ações e o segundo ficava fora da tela.
    actions: (match) => (
      <RowActions>
        <DropdownMenuItem onClick={() => setScheduling(toRef(match))}>
          <CalendarBlankIcon />
          {m.admin_common_schedule()}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!match.homeTeamId || !match.awayTeamId}
          onClick={() => setScoring(toRef(match))}
        >
          <NumberSquareOneIcon />
          {m.admin_matches_score()}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!match.homeTeamId || !match.awayTeamId}
          onClick={() => setCarding(toRef(match))}
        >
          <CardsIcon />
          {m.admin_common_cards()}
        </DropdownMenuItem>
        {match.status === 'FINISHED' && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setUnscoring(toRef(match))}
          >
            <ArrowCounterClockwiseIcon />
            {m.admin_common_undo_score()}
          </DropdownMenuItem>
        )}
      </RowActions>
    ),
  })

  function filter(key: 'category' | 'status', value: string) {
    void navigate({
      to: '/administrator/matches',
      search: { ...search, [key]: value || undefined, page: undefined },
    })
  }

  return (
    <Table
      to="/administrator/matches"
      search={search}
      isPlaceholderData={isPlaceholderData}
      isError={isError}
      onRetry={() => void refetch()}
    >
      <TableHeader>
        <TableTitle>{m.admin_matches_title()}</TableTitle>
        <TableActions>
          {/* Jogo novo não se cria aqui: nasce do sorteio da chave, e as fases
              seguintes se preenchem sozinhas com os vencedores. */}
          <Link
            to="/administrator/brackets"
            className={buttonVariants({ variant: 'outline' })}
          >
            <TreeStructureIcon />
            {m.admin_matches_set_up()}
          </Link>
        </TableActions>
      </TableHeader>

      <TableToolbar>
        <OptionCombobox
          aria-label={m.admin_common_category()}
          className="w-full sm:w-44"
          clearable
          value={search.category ?? ''}
          onValueChange={(value) => filter('category', value)}
          options={toOptions(['', ...CATEGORIES], {
            ...CATEGORY_LABELS,
            '': m.admin_matches_all_categories(),
          })}
        />
        <OptionCombobox
          aria-label={m.admin_common_status()}
          className="w-full sm:w-40"
          clearable
          value={search.status ?? ''}
          onValueChange={(value) => filter('status', value)}
          options={toOptions(['', ...MATCH_STATUSES], {
            ...MATCH_STATUS_LABELS,
            '': m.admin_matches_all_statuses(),
          })}
        />
      </TableToolbar>

      <TableContent>
        <TableEmpty table={table}>
          <EmptyStateTitle>{m.admin_matches_empty_title()}</EmptyStateTitle>
          <EmptyStateDescription>
            {m.admin_matches_empty_description()}
          </EmptyStateDescription>
          <EmptyStateActions>
            <Link
              to="/administrator/brackets"
              className={buttonVariants({ variant: 'default' })}
            >
              <TreeStructureIcon />
              {m.admin_matches_go_to_brackets()}
            </Link>
          </EmptyStateActions>
        </TableEmpty>

        <TableGrid table={table} />
      </TableContent>

      <TablePagination meta={data?.meta} />

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
      {unscoring && (
        <MatchUnscoreDialog
          key={unscoring.id}
          match={unscoring}
          open
          onOpenChange={() => setUnscoring(null)}
        />
      )}
    </Table>
  )
}
