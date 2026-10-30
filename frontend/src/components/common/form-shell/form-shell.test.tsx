// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import {
  FormShell,
  FormShellActions,
  FormShellBack,
  FormShellCard,
  FormShellContent,
  FormShellDiscard,
  FormShellHeader,
  FormShellSubmit,
  FormShellTitle,
} from './index'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: Readonly<{ to: string; children: React.ReactNode }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

function renderForm(
  isPending: boolean,
  onSubmit: React.ComponentProps<'form'>['onSubmit'] = undefined,
) {
  render(
    <FormShell formId="turma" backTo="/sobre" isPending={isPending}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Nova turma</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>
      <FormShellContent onSubmit={onSubmit}>
        <FormShellCard>
          <label>
            Nome
            <input name="name" />
          </label>
        </FormShellCard>
      </FormShellContent>
    </FormShell>,
  )
}

describe('FormShell', () => {
  it('a seta e o Descartar voltam para o mesmo destino', () => {
    renderForm(false)

    expect(
      screen.getByRole('link', { name: m.common_back() }).getAttribute('href'),
    ).toBe('/sobre')
    expect(
      screen
        .getByRole('link', { name: m.common_discard() })
        .getAttribute('href'),
    ).toBe('/sobre')
  })

  it('o título é o h1 e o Salvar aponta para o formulário da casca', () => {
    renderForm(false)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Nova turma' }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: m.common_save() })
        .getAttribute('form'),
    ).toBe('turma')
  })

  it('o Salvar do cabeçalho submete o formulário que rola', async () => {
    const onSubmit = vi.fn((event: React.SyntheticEvent) => {
      event.preventDefault()
    })
    renderForm(false, onSubmit)

    await userEvent.click(screen.getByRole('button', { name: m.common_save() }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('com a mutation em voo o Salvar trava', () => {
    renderForm(true)

    expect(
      screen
        .getByRole('button', { name: new RegExp(m.common_save()) })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('o formulário é post, para o envio nativo não pôr campo na URL', () => {
    renderForm(false)

    expect(
      screen.getByRole('textbox', { name: 'Nome' }).closest('form')?.method,
    ).toBe('post')
  })
})
