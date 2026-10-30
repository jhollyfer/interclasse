// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'
import { setLocale } from '#/paraglide/runtime'

import { LocaleSwitch } from './index'

vi.mock('#/paraglide/runtime', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setLocale: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('LocaleSwitch', () => {
  it('o gatilho tem nome acessível e mostra o idioma atual', () => {
    render(<LocaleSwitch />)

    const trigger = screen.getByRole('button', {
      name: new RegExp(`^${m.locale_switch_label()}`),
    })

    expect(trigger.textContent).toContain('pt-BR')
  })

  it('lista os três idiomas e marca o atual', async () => {
    render(<LocaleSwitch />)

    await userEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`^${m.locale_switch_label()}`),
      }),
    )

    expect(await screen.findAllByRole('menuitemradio')).toHaveLength(3)
    expect(
      screen
        .getByRole('menuitemradio', { name: m.locale_pt_br() })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('escolher outro idioma chama o setLocale dele', async () => {
    render(<LocaleSwitch />)

    await userEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`^${m.locale_switch_label()}`),
      }),
    )
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: m.locale_en() }),
    )

    expect(setLocale).toHaveBeenCalledWith('en')
  })
})
