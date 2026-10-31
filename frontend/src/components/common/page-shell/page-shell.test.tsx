// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  PageShell,
  PageShellContent,
} from './index'

afterEach(cleanup)

describe('PageShell', () => {
  it('renders the title as the screen h1 with the text the screen passed', () => {
    render(
      <PageShell>
        <PageHeader>
          <PageHeaderTitle>Turmas</PageHeaderTitle>
        </PageHeader>
      </PageShell>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Turmas' }),
    ).toBeTruthy()
  })

  it('shows the description beside the title', () => {
    render(
      <PageShell>
        <PageHeader>
          <PageHeaderTitle>Turmas</PageHeaderTitle>
          <PageHeaderDescription>24 turmas</PageHeaderDescription>
        </PageHeader>
      </PageShell>,
    )

    expect(screen.getByText('24 turmas')).toBeTruthy()
  })

  it('renders the actions loose, without a group gluing the buttons', () => {
    const { container } = render(
      <PageHeaderActions>
        <button type="button">Criar</button>
        <button type="button">Exportar</button>
      </PageHeaderActions>,
    )
    const actions = container.querySelector('[data-slot="page-header-actions"]')

    expect(actions?.querySelectorAll('[data-slot="button-group"]').length).toBe(
      0,
    )
    expect(screen.getAllByRole('button').length).toBe(2)
  })

  it('when there is no action, the action group does not even appear', () => {
    const { container } = render(<PageHeaderActions>{null}</PageHeaderActions>)

    expect(
      container.querySelector('[data-slot="page-header-actions"]'),
    ).toBeNull()
  })

  it('renders the content in the page body', () => {
    render(
      <PageShell>
        <PageShellContent>
          <p>Tabela</p>
        </PageShellContent>
      </PageShell>,
    )

    expect(screen.getByText('Tabela')).toBeTruthy()
  })
})
