// @vitest-environment jsdom

import { MATCH_PHASE } from '@interclasse/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createConfirmHandle, createDialogHandle } from '#/lib/dialog-handle'
import { m } from '#/paraglide/messages'

import {
  MatchCardsDialog,
  MatchScheduleDialog,
  MatchScoreDialog,
  MatchUnscoreDialog,
} from './index'
import type { MatchRef } from './index'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('#/integrations/tanstack-query/http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}))

vi.mock('#/hooks/use-unsaved-changes-blocker', () => ({
  useUnsavedChangesBlocker: () => undefined,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const MATCH_ID = '0b9c1f5e-4a6d-4c1e-9d3b-5f2a7e8c1d40'

const MATCH: MatchRef = {
  id: MATCH_ID,
  phase: MATCH_PHASE.SEMI,
  homeTeamId: 'home',
  awayTeamId: 'away',
  homeName: '6A',
  awayName: '7B',
  homeScore: null,
  awayScore: null,
  winnerTeamId: null,
  scheduledAt: null,
  location: null,
}

const META = { total: 0, perPage: 100, currentPage: 1, lastPage: 1 }

beforeEach(() => {
  request.mockImplementation(async (url: string) => {
    if (url.startsWith('/administrator/cards')) return { data: [], meta: META }
    if (url.endsWith('/athletes')) return { teams: [] }

    return {}
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function withClient(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function mutationsTo(url: string, method: string) {
  return request.mock.calls.filter(
    ([called, , options]) => called === url && options?.method === method,
  )
}

describe('MatchScoreDialog', () => {
  const handle = createDialogHandle<MatchRef>()

  function renderScore() {
    render(
      withClient(
        <>
          <button type="button" onClick={() => handle.openWithPayload(MATCH)}>
            Abrir
          </button>
          <MatchScoreDialog handle={handle} />
        </>,
      ),
    )
  }

  it('só monta o formulário aberto, com a partida do clique', async () => {
    renderScore()

    expect(screen.queryByRole('dialog')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    expect(
      await screen.findByRole('dialog', { name: m.common_match_score_title() }),
    ).toBeTruthy()
    expect(
      screen.getByText(m.common_match_versus({ home: '6A', away: '7B' })),
    ).toBeTruthy()
  })

  it('salva o placar na partida, avisa e fecha', async () => {
    renderScore()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await userEvent.type(await screen.findByLabelText('6A'), '3')
    await userEvent.type(screen.getByLabelText('7B'), '1')
    await userEvent.click(
      screen.getByRole('button', { name: m.common_match_score_submit() }),
    )

    await waitFor(() =>
      expect(
        mutationsTo(`/administrator/matches/${MATCH_ID}/score`, 'PUT'),
      ).toHaveLength(1),
    )
    expect(
      JSON.parse(
        String(
          mutationsTo(`/administrator/matches/${MATCH_ID}/score`, 'PUT')[0]?.[2]
            ?.body,
        ),
      ),
    ).toMatchObject({ homeScore: 3, awayScore: 1 })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(m.common_match_score_saved()),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('empate pede quem venceu nos pênaltis; placar decidido, não', async () => {
    renderScore()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await userEvent.type(await screen.findByLabelText('6A'), '2')
    expect(screen.queryByText(m.common_match_penalty_winner())).toBeNull()

    await userEvent.type(screen.getByLabelText('7B'), '2')

    expect(
      await screen.findByText(m.common_match_penalty_winner()),
    ).toBeTruthy()
  })
})

describe('MatchScheduleDialog', () => {
  const handle = createDialogHandle<MatchRef>()

  it('grava o local da partida', async () => {
    render(
      withClient(
        <>
          <button type="button" onClick={() => handle.openWithPayload(MATCH)}>
            Abrir
          </button>
          <MatchScheduleDialog handle={handle} />
        </>,
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await userEvent.type(
      await screen.findByLabelText(m.common_match_location()),
      'Quadra 2',
    )
    await userEvent.click(
      screen.getByRole('button', { name: m.common_match_schedule_submit() }),
    )

    await waitFor(() =>
      expect(
        mutationsTo(`/administrator/matches/${MATCH_ID}`, 'PUT'),
      ).toHaveLength(1),
    )
    expect(
      JSON.parse(
        String(
          mutationsTo(`/administrator/matches/${MATCH_ID}`, 'PUT')[0]?.[2]
            ?.body,
        ),
      ),
    ).toEqual({ scheduledAt: null, location: 'Quadra 2' })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        m.common_match_schedule_saved(),
      ),
    )
  })
})

describe('MatchUnscoreDialog', () => {
  const handle = createConfirmHandle<MatchRef>()

  it('só desfaz o placar depois de confirmar', async () => {
    render(
      withClient(
        <>
          <button
            type="button"
            onClick={() =>
              handle.openWithPayload({
                ...MATCH,
                homeScore: 1,
                awayScore: 0,
              })
            }
          >
            Abrir
          </button>
          <MatchUnscoreDialog handle={handle} />
        </>,
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    expect(
      await screen.findByText(
        m.common_match_unscore_description({
          home: '6A',
          homeScore: 1,
          awayScore: 0,
          away: '7B',
        }),
      ),
    ).toBeTruthy()
    expect(
      mutationsTo(`/administrator/matches/${MATCH_ID}/score`, 'DELETE'),
    ).toHaveLength(0)

    await userEvent.click(
      screen.getByRole('button', { name: m.common_match_unscore_submit() }),
    )

    await waitFor(() =>
      expect(
        mutationsTo(`/administrator/matches/${MATCH_ID}/score`, 'DELETE'),
      ).toHaveLength(1),
    )
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(m.common_match_unscored()),
    )
  })
})

describe('MatchCardsDialog', () => {
  const handle = createDialogHandle<MatchRef>()

  it('abre com a lista de cartões vazia e o formulário do novo', async () => {
    render(
      withClient(
        <>
          <button type="button" onClick={() => handle.openWithPayload(MATCH)}>
            Abrir
          </button>
          <MatchCardsDialog handle={handle} />
        </>,
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    expect(
      await screen.findByRole('dialog', { name: m.common_match_cards_title() }),
    ).toBeTruthy()
    expect(await screen.findByText(m.common_match_cards_empty())).toBeTruthy()
    expect(
      screen.getByRole('button', { name: m.common_match_card_submit() }),
    ).toBeTruthy()
  })
})
