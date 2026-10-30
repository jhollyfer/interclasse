// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { m } from '#/paraglide/messages'

import { InputPassword } from './index'

afterEach(cleanup)

describe('InputPassword', () => {
  it('nasce escondida', () => {
    render(<InputPassword aria-label="Senha" />)

    expect(screen.getByLabelText('Senha').getAttribute('type')).toBe('password')
  })

  it('o botão mostra e esconde, e troca o próprio nome', async () => {
    render(<InputPassword aria-label="Senha" />)

    await userEvent.click(
      screen.getByRole('button', { name: m.common_show_password() }),
    )

    expect(screen.getByLabelText('Senha').getAttribute('type')).toBe('text')

    await userEvent.click(
      screen.getByRole('button', { name: m.common_hide_password() }),
    )

    expect(screen.getByLabelText('Senha').getAttribute('type')).toBe('password')
  })

  it('o botão fica fora da ordem de Tab', () => {
    render(<InputPassword aria-label="Senha" />)

    expect(
      screen
        .getByRole('button', { name: m.common_show_password() })
        .getAttribute('tabindex'),
    ).toBe('-1')
  })
})
