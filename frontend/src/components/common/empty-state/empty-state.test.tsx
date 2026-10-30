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
  it('no vazio de verdade mostra o texto da tela e a ação', () => {
    renderState('empty')

    expect(screen.getByText('Nada cadastrado')).toBeTruthy()
    expect(screen.getByText('Cadastre o primeiro')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Criar' })).toBeTruthy()
  })

  it('no filtro troca título e descrição e some com a ação', () => {
    renderState('filtered')

    expect(screen.getByText(m.table_empty_filtered_title())).toBeTruthy()
    expect(screen.getByText(m.table_empty_filtered_description())).toBeTruthy()
    expect(screen.queryByText('Nada cadastrado')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Criar' })).toBeNull()
  })

  it('na lixeira troca o título, mantém a descrição e some com a ação', () => {
    renderState('trash')

    expect(screen.getByText(m.table_empty_trash_title())).toBeTruthy()
    expect(screen.getByText('Cadastre o primeiro')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Criar' })).toBeNull()
  })

  it('uma parte fora do EmptyState diz qual ficou sem provider', () => {
    expect(() => render(<EmptyStateTitle>x</EmptyStateTitle>)).toThrow(
      'EmptyStateTitle',
    )
  })
})
