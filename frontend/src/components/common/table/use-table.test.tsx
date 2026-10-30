// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TableColumns } from './use-table'
import { useTable } from './use-table'

type Row = { id: string; name: string }

const ROWS: ReadonlyArray<Row> = [
  { id: '1', name: 'Ana' },
  { id: '2', name: 'Bia' },
]

const COLUMNS: TableColumns<Row> = [
  { accessorKey: 'name', header: () => 'Nome', cell: () => null },
]

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

function columnIds(table: { getAllColumns: () => Array<{ id: string }> }) {
  return table.getAllColumns().map((column) => column.id)
}

describe('useTable', () => {
  it('sem ações nem seleção só tem as colunas da tela', () => {
    const { result } = renderHook(() =>
      useTable({ rows: ROWS, columns: COLUMNS, getRowId: (row) => row.id }),
    )

    expect(columnIds(result.current)).toEqual(['name'])
  })

  it('soma a caixa de seleção no começo e o menu de ações no fim', () => {
    const { result } = renderHook(() =>
      useTable({
        rows: ROWS,
        columns: COLUMNS,
        getRowId: (row) => row.id,
        actions: () => null,
        selectable: true,
      }),
    )

    expect(columnIds(result.current)).toEqual(['_select', 'name', '_actions'])
  })

  it('o predicado de selectable decide linha a linha', () => {
    const { result } = renderHook(() =>
      useTable({
        rows: ROWS,
        columns: COLUMNS,
        getRowId: (row) => row.id,
        selectable: (row) => row.name === 'Ana',
      }),
    )

    const [ana, bia] = result.current.getRowModel().rows

    expect(ana?.getCanSelect()).toBe(true)
    expect(bia?.getCanSelect()).toBe(false)
  })

  it('seleciona uma linha e a devolve selecionada', () => {
    const { result } = renderHook(() =>
      useTable({
        rows: ROWS,
        columns: COLUMNS,
        getRowId: (row) => row.id,
        selectable: true,
      }),
    )

    act(() => result.current.getRowModel().rows[0]?.toggleSelected(true))

    expect(result.current.getRowModel().rows[0]?.getIsSelected()).toBe(true)
    expect(result.current.getRowModel().rows[1]?.getIsSelected()).toBe(false)
  })

  it('devolve uma linha por registro, na ordem recebida', () => {
    const { result } = renderHook(() =>
      useTable({ rows: ROWS, columns: COLUMNS, getRowId: (row) => row.id }),
    )

    expect(result.current.getRowModel().rows.map((row) => row.id)).toEqual([
      '1',
      '2',
    ])
  })
})
