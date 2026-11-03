// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from '#/components/common/theme-provider'
import { TooltipProvider } from '#/components/ui/tooltip'
import { THEME_COOKIE } from '#/lib/theme'
import { m } from '#/paraglide/messages'

import { ThemeToggle } from './index'

vi.mock('@tanstack/react-router', () => ({
  ScriptOnce: () => null,
}))

afterEach(() => {
  cleanup()
  document.documentElement.className = ''
  document.cookie = `${THEME_COOKIE}=; max-age=0; path=/`
})

function renderToggle(theme: 'light' | 'dark') {
  document.documentElement.className = theme

  return render(
    <ThemeProvider theme={theme}>
      <TooltipProvider>
        <ThemeToggle />
      </TooltipProvider>
    </ThemeProvider>,
  )
}

describe('ThemeToggle', () => {
  it('has an accessible name', () => {
    renderToggle('light')

    expect(
      screen.getByRole('button', { name: m.panel_toggle_theme() }),
    ).toBeTruthy()
  })

  it('from light goes to dark', async () => {
    renderToggle('light')

    await userEvent.click(
      screen.getByRole('button', { name: m.panel_toggle_theme() }),
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('from dark goes back to light', async () => {
    renderToggle('dark')

    await userEvent.click(
      screen.getByRole('button', { name: m.panel_toggle_theme() }),
    )

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
