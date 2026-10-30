// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { m } from '#/paraglide/messages'

import { BulkArchive } from './index'

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderArchive(action: (item: string) => Promise<unknown>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <BulkArchive items={['a', 'b']} action={action} queryKey={['users']}>
        <ConfirmDialogTitle>Arquivar?</ConfirmDialogTitle>
        <ConfirmDialogDescription>Dois itens</ConfirmDialogDescription>
      </BulkArchive>
    </QueryClientProvider>,
  )
}

describe('BulkArchive', () => {
  it('confirmar roda a ação em cada item e relata o total', async () => {
    const action = vi.fn(async () => undefined)
    renderArchive(action)

    await userEvent.click(
      screen.getByRole('button', { name: m.admin_common_archive() }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: m.admin_common_archive() }),
    )

    await waitFor(() => expect(action).toHaveBeenCalledTimes(2))
    expect(action).toHaveBeenCalledWith('a')
    expect(action).toHaveBeenCalledWith('b')
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        m.admin_bulk_archive_done({ done: 2 }),
        { id: 'bulk-archive' },
      ),
    )
  })
})
