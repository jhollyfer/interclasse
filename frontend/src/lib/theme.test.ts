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
  it('aceita cada tema da lista', () => {
    for (const theme of THEMES) expect(parseTheme(theme)).toBe(theme)
  })

  it('cookie ausente ou torto vale system', () => {
    expect(parseTheme(undefined)).toBe('system')
    expect(parseTheme('roxo')).toBe('system')
    expect(parseTheme(42)).toBe('system')
  })
})

describe('THEME_CLASS', () => {
  it('system não leva classe: o script antes da hidratação decide', () => {
    expect(THEME_CLASS).toEqual({ light: 'light', dark: 'dark', system: '' })
  })
})

describe('writeTheme', () => {
  it('grava a preferência no cookie', () => {
    writeTheme('dark')

    expect(document.cookie).toContain(`${THEME_COOKIE}=dark`)
  })
})

describe('applyTheme', () => {
  it('escreve a classe e o color-scheme do tema escolhido', () => {
    applyTheme('dark')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('troca a classe anterior em vez de somar', () => {
    applyTheme('dark')
    applyTheme('light')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('system segue a preferência do sistema', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))

    applyTheme('system')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
