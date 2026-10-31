// @vitest-environment jsdom

import type { AdministratorCardPaginateResponse } from '@interclasse/shared'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fromPartial } from '@total-typescript/shoehorn'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import { CardList } from './index'

afterEach(cleanup)

const CARD = fromPartial<AdministratorCardPaginateResponse>({
  id: 'c1',
  color: 'YELLOW',
  note: 'Falta dura',
  student: { name: 'Maria' },
  team: { classroom: { name: '7A' } },
  match: {
    phase: 'FINAL',
    scheduledAt: null,
    homeTeam: { classroom: { name: '7A' } },
    awayTeam: null,
    bracket: { category: 'F1', sport: { name: 'Futsal' } },
  },
})

describe('CardList', () => {
  it('when there is no card, says what the screen told it to say', () => {
    render(<CardList cards={[]} empty="Nenhum cartão" />)

    expect(screen.getByText('Nenhum cartão')).toBeTruthy()
  })

  it('shows the athlete, the classroom and the note', () => {
    render(<CardList cards={[CARD]} empty="Nenhum cartão" showMatch={false} />)

    expect(screen.getByText('Maria')).toBeTruthy()
    expect(screen.getByText(/7A/)).toBeTruthy()
    expect(screen.getByText('Falta dura')).toBeTruthy()
  })

  it('gives the color dot an accessible name', () => {
    render(<CardList cards={[CARD]} empty="x" showMatch={false} />)

    expect(screen.getByRole('img').getAttribute('aria-label')).toContain(
      m.common_card_aria({ color: '' }).trim().split(' ')[0] ?? '',
    )
  })

  it('renders the delete button only with onDelete and returns the row card', async () => {
    const onDelete = vi.fn()
    const { rerender } = render(
      <CardList cards={[CARD]} empty="x" showMatch={false} />,
    )

    expect(screen.queryByRole('button')).toBeNull()

    rerender(
      <CardList
        cards={[CARD]}
        empty="x"
        showMatch={false}
        onDelete={onDelete}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', {
        name: m.common_card_delete_aria({ name: 'Maria' }),
      }),
    )

    expect(onDelete).toHaveBeenCalledWith(CARD)
  })

  it('when loading, shows the skeleton and not the empty message', () => {
    render(<CardList cards={[]} isPending empty="Nenhum cartão" />)

    expect(screen.queryByText('Nenhum cartão')).toBeNull()
  })
})
