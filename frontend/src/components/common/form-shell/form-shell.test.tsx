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
    <FormShell formId="turma" backTo="/about" isPending={isPending}>
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
  it('when the arrow and Descartar are used, go back to the same destination', () => {
    renderForm(false)

    expect(
      screen.getByRole('link', { name: m.common_back() }).getAttribute('href'),
    ).toBe('/about')
    expect(
      screen
        .getByRole('link', { name: m.common_discard() })
        .getAttribute('href'),
    ).toBe('/about')
  })

  it('renders the title as the h1 and points Salvar at the shell form', () => {
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

  it('when the header Salvar is clicked, submits the scrolling form', async () => {
    const onSubmit = vi.fn((event: React.SyntheticEvent) => {
      event.preventDefault()
    })
    renderForm(false, onSubmit)

    await userEvent.click(screen.getByRole('button', { name: m.common_save() }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('when the mutation is in flight, locks Salvar', () => {
    renderForm(true)

    expect(
      screen
        .getByRole('button', { name: new RegExp(m.common_save()) })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('renders the form as post, so a native submit puts no field in the URL', () => {
    renderForm(false)

    expect(
      screen.getByRole('textbox', { name: 'Nome' }).closest('form')?.method,
    ).toBe('post')
  })
})
