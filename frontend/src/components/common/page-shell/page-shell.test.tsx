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
  it('o título é o h1 da tela e leva o texto que a tela passou', () => {
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

  it('a descrição aparece ao lado do título', () => {
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

  it('as ações entram soltas, sem grupo que cole os botões', () => {
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

  it('sem ação nenhuma o grupo de ações nem aparece', () => {
    const { container } = render(<PageHeaderActions>{null}</PageHeaderActions>)

    expect(
      container.querySelector('[data-slot="page-header-actions"]'),
    ).toBeNull()
  })

  it('o conteúdo entra no corpo da página', () => {
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
