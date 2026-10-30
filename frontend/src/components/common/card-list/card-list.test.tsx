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
  it('sem cartão diz o que a tela mandou dizer', () => {
    render(<CardList cards={[]} empty="Nenhum cartão" />)

    expect(screen.getByText('Nenhum cartão')).toBeTruthy()
  })

  it('mostra o atleta, a turma e a observação', () => {
    render(<CardList cards={[CARD]} empty="Nenhum cartão" showMatch={false} />)

    expect(screen.getByText('Maria')).toBeTruthy()
    expect(screen.getByText(/7A/)).toBeTruthy()
    expect(screen.getByText('Falta dura')).toBeTruthy()
  })

  it('a bolinha da cor tem nome acessível', () => {
    render(<CardList cards={[CARD]} empty="x" showMatch={false} />)

    expect(screen.getByRole('img').getAttribute('aria-label')).toContain(
      m.common_card_aria({ color: '' }).trim().split(' ')[0] ?? '',
    )
  })

  it('o botão de apagar só existe com onDelete e devolve o cartão da linha', async () => {
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

  it('carregando mostra o esqueleto e não a mensagem de vazio', () => {
    render(<CardList cards={[]} isPending empty="Nenhum cartão" />)

    expect(screen.queryByText('Nenhum cartão')).toBeNull()
  })
})
