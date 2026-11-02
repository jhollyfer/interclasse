// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import type * as React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useTable } from './index'
import type { TableColumns } from './index'
import { TableMobileCards } from './table-mobile-cards'

beforeEach(() => {
  localStorage.clear()
})

afterEach(cleanup)

type Row = {
  id: string
  name: string
  email: string
  role: string
  status: string
  city: string
  age: string
  team: string
}

const ROW: Row = {
  id: '1',
  name: 'Ana',
  email: 'ana@example.com',
  role: 'Admin',
  status: 'Active',
  city: 'Recife',
  age: '15',
  team: 'Blue',
}

const COLUMNS: TableColumns<Row> = [
  { accessorKey: 'name', header: () => 'Name', meta: { label: 'Name' } },
  {
    accessorKey: 'email',
    header: () => 'Email',
    meta: { label: 'Email', mobile: 'subtitle' },
  },
  {
    accessorKey: 'role',
    header: () => 'Role',
    meta: { label: 'Role', mobile: 'badge' },
  },
  { accessorKey: 'status', header: () => 'Status', meta: { label: 'Status' } },
  { accessorKey: 'city', header: () => 'City', meta: { label: 'City' } },
  { accessorKey: 'age', header: () => 'Age', meta: { label: 'Age' } },
  {
    accessorKey: 'team',
    header: () => 'Team',
    meta: { label: 'Team', mobile: 'hidden' },
  },
]

function Harness(): React.JSX.Element {
  const table = useTable({
    rows: [ROW],
    columns: COLUMNS,
    getRowId: (row) => row.id,
  })

  return <TableMobileCards table={table} />
}

describe('TableMobileCards', () => {
  it('places each column by its meta: title, subtitle and badge', () => {
    const { container } = render(<Harness />)

    expect(
      container.querySelector('[data-slot="table-mobile-card-title"]')
        ?.textContent,
    ).toBe('Ana')
    expect(
      container.querySelector('[data-slot="table-mobile-card-subtitle"]')
        ?.textContent,
    ).toBe('ana@example.com')
    expect(
      container.querySelector('[data-slot="table-mobile-card-badge"]')
        ?.textContent,
    ).toBe('Admin')
  })

  it('caps the grid at three fields and leaves hidden columns out', () => {
    const { container } = render(<Harness />)
    const labels = Array.from(container.querySelectorAll('dt')).map(
      (term) => term.textContent,
    )

    expect(labels).toEqual(['Status', 'City', 'Age'])
    expect(container.textContent).not.toContain('Blue')
  })
})
