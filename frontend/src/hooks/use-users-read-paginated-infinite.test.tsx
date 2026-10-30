// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useUsersReadPaginatedInfinite } from './use-users-read-paginated-infinite'

const request = vi.fn()

vi.mock('#/integrations/tanstack-query/http', () => ({
  request: (...args: ReadonlyArray<unknown>) => request(...args),
}))

function page(currentPage: number, lastPage: number, names: Array<string>) {
  return {
    meta: { currentPage, lastPage },
    data: names.map((name) => ({ id: name, name })),
  }
}

function wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useUsersReadPaginatedInfinite', () => {
  it('pede 20 por página do papel, ordenado por nome, sem busca', async () => {
    request.mockResolvedValue(page(1, 1, ['Ana']))

    const { result } = renderHook(
      () => useUsersReadPaginatedInfinite({ role: 'ADVISOR', search: '' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.users).toHaveLength(1))

    const url: unknown = request.mock.calls[0]?.[0]

    expect(url).toContain('role=ADVISOR')
    expect(url).toContain('perPage=20')
    expect(url).toContain('sort=name')
    expect(url).not.toContain('search=')
  })

  it('a lista cresce por fetchNextPage e para na última página', async () => {
    request
      .mockResolvedValueOnce(page(1, 2, ['Ana']))
      .mockResolvedValueOnce(page(2, 2, ['Bia']))

    const { result } = renderHook(
      () => useUsersReadPaginatedInfinite({ role: 'ADVISOR', search: '' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.hasNextPage).toBe(true))

    await act(() => result.current.fetchNextPage())

    await waitFor(() =>
      expect(result.current.users.map((user) => user.name)).toEqual([
        'Ana',
        'Bia',
      ]),
    )
    expect(result.current.hasNextPage).toBe(false)
  })

  it('o termo digitado só vai ao servidor depois do debounce', async () => {
    request.mockResolvedValue(page(1, 1, ['Ana']))

    const { result, rerender } = renderHook(
      ({ search }) =>
        useUsersReadPaginatedInfinite({ role: 'ADVISOR', search }),
      { wrapper, initialProps: { search: '' } },
    )

    await waitFor(() => expect(result.current.users).toHaveLength(1))

    rerender({ search: 'an' })

    expect(request).toHaveBeenCalledTimes(1)

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2), {
      timeout: 2000,
    })

    expect(request.mock.calls[1]?.[0]).toContain('search=an')
  })
})
