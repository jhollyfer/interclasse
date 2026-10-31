// @vitest-environment jsdom

import {
  BRACKET_STATUS,
  CATEGORY,
  MATCH_PHASE,
  MATCH_STATUS,
} from '@interclasse/shared'
import type { AdministratorBracketShowResponse } from '@interclasse/shared'
import { cleanup, render, screen, within } from '@testing-library/react'
import { fromPartial } from '@total-typescript/shoehorn'
import { afterEach, describe, expect, it } from 'vitest'

import { m } from '#/paraglide/messages'

import { BracketTree } from './index'
import type { BracketMatch } from './index'

afterEach(cleanup)

const SEMI_A = fromPartial<BracketMatch>({
  id: 'a',
  phase: MATCH_PHASE.SEMI,
  round: 1,
  position: 0,
  status: MATCH_STATUS.FINISHED,
  homeTeamId: 't1',
  awayTeamId: 't2',
  homeName: '6A',
  awayName: '6B',
  homeScore: 3,
  awayScore: 1,
  winnerTeamId: 't1',
  scheduledAt: null,
  location: null,
})

const SEMI_B = fromPartial<BracketMatch>({
  id: 'b',
  phase: MATCH_PHASE.SEMI,
  round: 1,
  position: 1,
  status: MATCH_STATUS.SCHEDULED,
  homeTeamId: 't3',
  awayTeamId: 't4',
  homeName: '7A',
  awayName: '7B',
  homeScore: null,
  awayScore: null,
  winnerTeamId: null,
  scheduledAt: null,
  location: 'Quadra',
})

const FINAL = fromPartial<BracketMatch>({
  id: 'f',
  phase: MATCH_PHASE.FINAL,
  round: 2,
  position: 0,
  status: MATCH_STATUS.SCHEDULED,
  homeTeamId: 't1',
  awayTeamId: null,
  homeName: '6A',
  awayName: null,
  homeScore: null,
  awayScore: null,
  winnerTeamId: null,
  scheduledAt: null,
  location: null,
})

function bracket(
  matches: BracketMatch[],
  championTeamId: string | null = null,
): AdministratorBracketShowResponse {
  return fromPartial<AdministratorBracketShowResponse>({
    category: CATEGORY.F2,
    status: BRACKET_STATUS.KNOCKOUT,
    championTeamId,
    matches,
  })
}

describe('BracketTree', () => {
  it('draws one column per round plus the champion column', () => {
    render(<BracketTree bracket={bracket([SEMI_A, SEMI_B, FINAL])} />)

    expect(screen.getAllByRole('heading', { level: 3 }).length).toBe(3)
    expect(
      screen.getByRole('heading', { name: m.common_bracket_champion() }),
    ).toBeTruthy()
  })

  it('numbers the games in round and position order', () => {
    render(<BracketTree bracket={bracket([FINAL, SEMI_B, SEMI_A])} />)

    expect(
      screen.getByText(m.common_bracket_game_number({ number: 1 })),
    ).toBeTruthy()
    expect(
      screen.getByText(m.common_bracket_game_number({ number: 3 })),
    ).toBeTruthy()
  })

  it('when a team wins, it gets the check mark and the loser is struck out', () => {
    render(<BracketTree bracket={bracket([SEMI_A, SEMI_B, FINAL])} />)

    expect(screen.getAllByText(m.common_bracket_advanced()).length).toBe(1)
    expect(screen.getAllByText(m.common_bracket_out()).length).toBe(1)
  })

  it('when a slot is empty, says which game its team comes from', () => {
    render(<BracketTree bracket={bracket([SEMI_A, SEMI_B, FINAL])} />)

    expect(
      screen.getByText(m.common_bracket_winner_of({ number: 2 })),
    ).toBeTruthy()
  })

  it('when there is no champion, the final column says to be defined; with one, the name', () => {
    const { unmount } = render(
      <BracketTree bracket={bracket([SEMI_A, SEMI_B, FINAL])} />,
    )
    const column = screen
      .getByRole('heading', { name: m.common_bracket_champion() })
      .closest('li')
    if (!column) throw new Error('coluna da campeã ausente')

    expect(within(column).getByText(m.common_bracket_pending())).toBeTruthy()
    unmount()

    render(<BracketTree bracket={bracket([SEMI_A, SEMI_B, FINAL], 't1')} />)
    const won = screen
      .getByRole('heading', { name: m.common_bracket_champion() })
      .closest('li')
    if (!won) throw new Error('coluna da campeã ausente')

    expect(within(won).getByText('6A')).toBeTruthy()
  })

  it('renders renderActions under each match', () => {
    render(
      <BracketTree
        bracket={bracket([SEMI_A, SEMI_B, FINAL])}
        renderActions={(match) => <span>ação {match.id}</span>}
      />,
    )

    expect(screen.getByText('ação a')).toBeTruthy()
    expect(screen.getByText('ação f')).toBeTruthy()
  })

  it('when a slot has no match, it is a bye and shows who advanced', () => {
    render(<BracketTree bracket={bracket([SEMI_A, FINAL])} />)

    expect(
      screen.getByText(
        m.common_bracket_bye({ team: m.common_bracket_pending() }),
      ),
    ).toBeTruthy()
  })
})
