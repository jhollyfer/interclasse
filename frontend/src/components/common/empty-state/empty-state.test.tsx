// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { m } from '#/paraglide/messages'

import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
} from './index'

afterEach(cleanup)

function renderState(reason: 'empty' | 'filtered' | 'trash') {
  render(
    <EmptyState reason={reason}>
      <EmptyStateTitle>Nada cadastrado</EmptyStateTitle>
      <EmptyStateDescription>Cadastre o primeiro</EmptyStateDescription>
      <EmptyStateActions>
        <button type="button">Criar</button>
      </EmptyStateActions>
    </EmptyState>,
  )
}

describe('EmptyState', () => {
  it('when truly empty, shows the screen text and the action', () => {
    renderState('empty')

    expect(screen.getByText('Nada cadastrado')).toBeTruthy()
    expect(screen.getByText('Cadastre o primeiro')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Criar' })).toBeTruthy()
  })

  it('when filtered, swaps title and description and drops the action', () => {
    renderState('filtered')

    expect(screen.getByText(m.table_empty_filtered_title())).toBeTruthy()
    expect(screen.getByText(m.table_empty_filtered_description())).toBeTruthy()
    expect(screen.queryByText('Nada cadastrado')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Criar' })).toBeNull()
  })

  it('when in the trash, swaps the title, keeps the description and drops the action', () => {
    renderState('trash')

    expect(screen.getByText(m.table_empty_trash_title())).toBeTruthy()
    expect(screen.getByText('Cadastre o primeiro')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Criar' })).toBeNull()
  })

  it('when a part is outside EmptyState, says which one is without a provider', () => {
    expect(() => render(<EmptyStateTitle>x</EmptyStateTitle>)).toThrow(
      'EmptyStateTitle',
    )
  })
})
