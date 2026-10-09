import * as React from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CalendarBlankIcon, NumberSquareOneIcon } from '@phosphor-icons/react'

import {
  MatchScheduleDialog,
  MatchScoreDialog,
} from '#/components/common/match-dialogs'
import type { MatchRef } from '#/components/common/match-dialogs'
import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
import {
  Table,
  TableContent,
  TableEmpty,
  TableEmptyDescription,
  TableEmptyTitle,
  TableGrid,
  TableHeader,
  TablePagination,
  TableTitle,
  TableToolbar,
  useTable,
} from '#/components/common/table'
import type { TableColumns } from '#/components/common/table'
import { Badge } from '#/components/ui/badge'
import { DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { RowActions } from '#/components/common/row-actions'
import { matchesQueryOptions } from '#/integrations/tanstack-query/queries'
import { CATEGORIES, MATCH_STATUSES } from '#/lib/entity'
import {
  CATEGORY_SHORT_LABELS,
  CATEGORY_LABELS,
  MATCH_PHASE_LABELS,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_VARIANTS,
  formatDate,
} from '#/lib/labels'
import type { Match } from '#/lib/validator'

const route = getRouteApi('/_private/administrator/matches/')

/** A partida no formato que os diálogos esperam: nomes já resolvidos. */
function toRef(match: Match): MatchRef {
  return {
    ...match,
    homeName: match.homeTeam?.classroom.name ?? null,
    awayName: match.awayTeam?.classroom.name ?? null,
  }
}

function phaseOf(match: Match): string {
  return MATCH_PHASE_LABELS[match.phase] ?? match.phase
}

const columns: TableColumns<Match> = [
  // O jogo primeiro: é o que se procura na lista, e é o que a tabela estreita
  // não pode cortar.
  {
    id: 'game',
    accessorFn: (row) => row.id,
    meta: { label: 'Jogo' },
    size: 240,
    header: () => 'Jogo',
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.homeTeam?.classroom.name ?? 'A definir'}{' '}
        <span className="tabular-nums">
          {row.original.homeScore ?? '-'} x {row.original.awayScore ?? '-'}
        </span>{' '}
        {row.original.awayTeam?.classroom.name ?? 'A definir'}
      </span>
    ),
    enableHiding: false,
  },
  {
    id: 'when',
    accessorFn: (row) => row.scheduledAt ?? '',
    meta: { label: 'Quando' },
    size: 150,
    header: () => 'Quando',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.scheduledAt)}
      </span>
    ),
  },
  {
    id: 'sport',
    accessorFn: (row) => row.bracket?.sport?.name ?? '',
    meta: { label: 'Modalidade' },
    size: 170,
    header: () => 'Modalidade',
    cell: ({ row }) => {
      const bracket = row.original.bracket
      return `${bracket?.sport?.name ?? ''} · ${CATEGORY_SHORT_LABELS[bracket?.category ?? ''] ?? ''}`
    },
  },
  {
    id: 'phase',
    accessorFn: (row) => phaseOf(row),
    meta: { label: 'Fase' },
    size: 110,
    header: () => 'Fase',
    cell: ({ row }) => phaseOf(row.original),
  },
  {
    accessorKey: 'status',
    meta: { label: 'Situação' },
    size: 120,
    header: () => 'Situação',
    cell: ({ row }) => (
      <Badge variant={MATCH_STATUS_VARIANTS[row.original.status]}>
        {MATCH_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
]

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
          Agendar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!match.homeTeamId || !match.awayTeamId}
          onClick={() => setScoring(toRef(match))}
        >
          <NumberSquareOneIcon />
          Lançar placar
        </DropdownMenuItem>
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
        <TableTitle>Partidas</TableTitle>
      </TableHeader>

      <TableToolbar>
        <OptionCombobox
          aria-label="Categoria"
          className="w-full sm:w-44"
          clearable
          value={search.category ?? ''}
          onValueChange={(value) => filter('category', value)}
          options={toOptions(['', ...CATEGORIES], {
            ...CATEGORY_LABELS,
            '': 'Toda categoria',
          })}
        />
        <OptionCombobox
          aria-label="Situação"
          className="w-full sm:w-40"
          clearable
          value={search.status ?? ''}
          onValueChange={(value) => filter('status', value)}
          options={toOptions(['', ...MATCH_STATUSES], {
            ...MATCH_STATUS_LABELS,
            '': 'Toda situação',
          })}
        />
      </TableToolbar>

      <TableContent>
        <TableEmpty table={table}>
          <TableEmptyTitle>Nenhuma partida</TableEmptyTitle>
          <TableEmptyDescription>
            As partidas nascem do sorteio de cada chave.
          </TableEmptyDescription>
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
    </Table>
  )
}
