// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import {
  NotFoundPage,
  NotFoundPageActions,
  NotFoundPageDescription,
  NotFoundPageTitle,
} from './index'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
  }: Readonly<{ to: string; children: React.ReactNode }>) => (
    <a href={to}>{children}</a>
  ),
}))

afterEach(cleanup)

describe('NotFoundPage', () => {
  it('without children, writes the generic 404 with the exit to the start', () => {
    render(<NotFoundPage />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: m.common_not_found_title(),
      }),
    ).toBeTruthy()
    expect(screen.getByText('404')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: m.common_back_home() })
        .getAttribute('href'),
    ).toBe('/')
  })

  it('when the error boundary uses it, swaps the giant number', () => {
    render(<NotFoundPage code="500" />)

    expect(screen.getByText('500')).toBeTruthy()
    expect(screen.queryByText('404')).toBeNull()
  })

  it('when a screen knows what is missing, swaps the parts and keeps the rest', () => {
    render(
      <NotFoundPage>
        <NotFoundPageTitle>Turma não encontrada</NotFoundPageTitle>
        <NotFoundPageDescription>Confira o link.</NotFoundPageDescription>
      </NotFoundPage>,
    )

    expect(
      screen.getByRole('heading', { name: 'Turma não encontrada' }),
    ).toBeTruthy()
    expect(screen.getByText('Confira o link.')).toBeTruthy()
  })

  it('keeps the actions loose in a group and drops them when there is none', () => {
    const { container, rerender } = render(
      <NotFoundPageActions>
        <button type="button">Tentar de novo</button>
      </NotFoundPageActions>,
    )

    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()

    rerender(<NotFoundPageActions>{null}</NotFoundPageActions>)

    expect(
      container.querySelector('[data-slot="not-found-page-actions"]'),
    ).toBeNull()
  })
})
