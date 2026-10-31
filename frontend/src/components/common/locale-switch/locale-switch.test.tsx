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
  it('gives the trigger an accessible name and shows the current language', () => {
    render(<LocaleSwitch />)

    const trigger = screen.getByRole('button', {
      name: new RegExp(`^${m.locale_switch_label()}`),
    })

    expect(trigger.textContent).toContain('pt-BR')
  })

  it('lists the three languages and marks the current one', async () => {
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

  it('when another language is chosen, calls its setLocale', async () => {
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
