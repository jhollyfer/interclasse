// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  THEMES,
  THEME_CLASS,
  THEME_COOKIE,
  applyTheme,
  parseTheme,
  writeTheme,
} from './theme'

afterEach(() => {
  document.documentElement.className = ''
  document.documentElement.style.colorScheme = ''
  document.cookie = `${THEME_COOKIE}=; max-age=0; path=/`
  vi.unstubAllGlobals()
})

describe('parseTheme', () => {
  it('accepts each theme in the list', () => {
    for (const theme of THEMES) expect(parseTheme(theme)).toBe(theme)
  })

  it('treats an absent or crooked cookie as system', () => {
    expect(parseTheme(undefined)).toBe('system')
    expect(parseTheme('roxo')).toBe('system')
    expect(parseTheme(42)).toBe('system')
  })
})

describe('THEME_CLASS', () => {
  it('gives system no class: the script before hydration decides', () => {
    expect(THEME_CLASS).toEqual({ light: 'light', dark: 'dark', system: '' })
  })
})

describe('writeTheme', () => {
  it('saves the preference in the cookie', () => {
    writeTheme('dark')

    expect(document.cookie).toContain(`${THEME_COOKIE}=dark`)
  })
})

describe('applyTheme', () => {
  it('writes the class and the color-scheme of the chosen theme', () => {
    applyTheme('dark')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('swaps the previous class instead of adding to it', () => {
    applyTheme('dark')
    applyTheme('light')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('makes system follow the system preference', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))

    applyTheme('system')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
