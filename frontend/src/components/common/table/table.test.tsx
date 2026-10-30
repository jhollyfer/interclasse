// @vitest-environment jsdom

import { TRASHED_MODE } from '@interclasse/shared'
import type { PaginationMeta } from '@interclasse/shared'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fromPartial } from '@total-typescript/shoehorn'
import type * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EmptyStateTitle } from '#/components/common/empty-state'
import type { ListSearch } from '#/lib/list-search'
import { m } from '#/paraglide/messages'

import {
  Table,
  TableContent,
  TableEmpty,
  TableGrid,
  TableHeader,
  TablePagination,
  TableTitle,
  useTable,
} from './index'
import type { TableColumns } from './index'
import { TableSkeleton } from './table-skeleton'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({
    to,
    search,
    children,
    disabled,
    ...props
  }: Readonly<{
    to: string
    search?: Record<string, unknown>
    disabled?: boolean
    children?: React.ReactNode
  }>) => (
    <a
      href={to.concat('?page=', String(search?.page ?? 1))}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </a>
  ),
}))

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

type Row = { id: string; name: string }

const COLUMNS: TableColumns<Row> = [
  {
    accessorKey: 'name',
    header: () => 'Nome',
    cell: ({ row }) => row.original.name,
  },
]

const META = fromPartial<PaginationMeta>({
  total: 45,
  perPage: 20,
  currentPage: 2,
  lastPage: 3,
})

type HarnessProps = Readonly<{
  rows: ReadonlyArray<Row>
  search?: ListSearch
  isError?: boolean
  onRetry?: () => void
  meta?: PaginationMeta
}>

function Harness({
  rows,
  search = {},
  isError = false,
  onRetry,
  meta,
}: HarnessProps) {
  const table = useTable({
    rows,
    columns: COLUMNS,
    getRowId: (row) => row.id,
  })

  return (
    <Table to="/lista" search={search} isError={isError} onRetry={onRetry}>
      <TableHeader>
        <TableTitle>Turmas</TableTitle>
      </TableHeader>
      <TableContent>
        <TableEmpty table={table}>
          <EmptyStateTitle>Nenhuma turma</EmptyStateTitle>
        </TableEmpty>
        <TableGrid table={table} />
      </TableContent>
      <TablePagination meta={meta} />
    </Table>
  )
}

describe('Table', () => {
  it('carregando mostra o esqueleto no formato da lista', () => {
    const { container } = render(<TableSkeleton columns={3} rows={2} />)

    expect(container.querySelector('[data-slot="table-skeleton"]')).toBeTruthy()
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0)
  })

  it('com dados desenha o título e uma linha por registro', () => {
    render(
      <Harness
        rows={[
          { id: '1', name: 'Ana' },
          { id: '2', name: 'Bia' },
        ]}
      />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Turmas' }),
    ).toBeTruthy()
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bia').length).toBeGreaterThan(0)
    expect(screen.queryByText('Nenhuma turma')).toBeNull()
  })

  it('vazio de verdade mostra o texto da tela', () => {
    render(<Harness rows={[]} />)

    expect(screen.getByText('Nenhuma turma')).toBeTruthy()
  })

  it('vazio por filtro troca o texto e limpa o termo no botão', async () => {
    render(<Harness rows={[]} search={{ search: 'xyz', page: 3 }} />)

    expect(screen.getByText(m.table_empty_filtered_title())).toBeTruthy()

    await userEvent.click(
      screen.getByRole('button', { name: m.table_empty_filtered_action() }),
    )

    expect(navigate).toHaveBeenCalledWith({
      to: '/lista',
      search: { search: undefined, page: undefined },
    })
  })

  it('vazio na lixeira diz que a lixeira está vazia', () => {
    render(<Harness rows={[]} search={{ trashed: TRASHED_MODE.ONLY }} />)

    expect(screen.getByText(m.table_empty_trash_title())).toBeTruthy()
  })

  it('o filtro vence a lixeira quando os dois estão ativos', () => {
    render(
      <Harness
        rows={[]}
        search={{ trashed: TRASHED_MODE.ONLY, search: 'xyz' }}
      />,
    )

    expect(screen.getByText(m.table_empty_filtered_title())).toBeTruthy()
  })

  it('erro troca a lista pela mensagem e o botão refaz a consulta', async () => {
    const onRetry = vi.fn()
    render(<Harness rows={[]} isError onRetry={onRetry} />)

    expect(screen.getByText(m.table_load_error_title())).toBeTruthy()
    expect(screen.queryByText('Nenhuma turma')).toBeNull()

    await userEvent.click(
      screen.getByRole('button', { name: m.common_retry() }),
    )

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('erro sem onRetry não oferece tentar de novo', () => {
    render(<Harness rows={[]} isError />)

    expect(screen.queryByRole('button', { name: m.common_retry() })).toBeNull()
  })

  it('a paginação mostra a página e trava os extremos', () => {
    render(<Harness rows={[{ id: '1', name: 'Ana' }]} meta={META} />)

    expect(screen.getByText(m.table_page({ current: 2, last: 3 }))).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: m.table_next_page() })
        .getAttribute('href'),
    ).toBe('/lista?page=3')
    expect(
      screen
        .getByRole('link', { name: m.table_previous_page() })
        .getAttribute('href'),
    ).toBe('/lista?page=1')
  })

  it('sem meta não há rodapé de paginação', () => {
    const { container } = render(<Harness rows={[]} />)

    expect(container.querySelector('[data-slot="table-pagination"]')).toBeNull()
  })

  it('uma parte fora do Table diz qual ficou sem provider', () => {
    expect(() => render(<TableContent>x</TableContent>)).toThrow('TableContent')
  })
})
