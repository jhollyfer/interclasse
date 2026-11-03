// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from '#/components/common/theme-provider'
import { THEME_COOKIE } from '#/lib/theme'
import type { Theme } from '#/lib/theme'
import { m } from '#/paraglide/messages'

import { ThemeToggle } from './index'

vi.mock('@tanstack/react-router', () => ({
  ScriptOnce: () => null,
}))

// jsdom has no `matchMedia`, which the `system` theme reads to resolve light or dark.
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
  document.documentElement.className = ''
  document.cookie = `${THEME_COOKIE}=; max-age=0; path=/`
})

function renderToggle(theme: Theme) {
  return render(
    <ThemeProvider theme={theme}>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

async function openMenu(): Promise<void> {
  await userEvent.click(
    screen.getByRole('button', { name: m.panel_toggle_theme() }),
  )
}

describe('ThemeToggle', () => {
  it('has an accessible name', () => {
    renderToggle('light')

    expect(
      screen.getByRole('button', { name: m.panel_toggle_theme() }),
    ).toBeTruthy()
  })

  it('lists light, dark and system and marks the current one', async () => {
    renderToggle('dark')

    await openMenu()

    expect(await screen.findAllByRole('menuitemradio')).toHaveLength(3)
    expect(
      screen
        .getByRole('menuitemradio', { name: m.theme_dark() })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('choosing dark applies the dark class on <html>', async () => {
    renderToggle('light')

    await openMenu()
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: m.theme_dark() }),
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('choosing light removes the dark class', async () => {
    document.documentElement.className = 'dark'
    renderToggle('dark')

    await openMenu()
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: m.theme_light() }),
    )

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('choosing system saves the preference as system', async () => {
    renderToggle('light')

    await openMenu()
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: m.theme_system() }),
    )

    expect(document.cookie).toContain(`${THEME_COOKIE}=system`)
  })
})
