import { createIsomorphicFn } from '@tanstack/react-start'

import * as server from './theme.server'

/**
 * Tema claro/escuro (`frontend.md` §3.2, §6): a preferência mora num cookie
 * que o servidor lê no `loader` da raiz, para o primeiro HTML já sair com a
 * classe certa e sem flash. _doc-lib/shadcn.md#docs/dark-mode/tanstack-start.
 */
export const THEME_COOKIE = 'theme'

const ONE_YEAR = 60 * 60 * 24 * 365

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]

/** A classe que o `<html>` leva. `system` não tem: o script antes da hidratação decide. */
export const THEME_CLASS = {
  light: 'light',
  dark: 'dark',
  system: '',
} as const satisfies Record<Theme, string>

/** Cookie ausente ou torto vale `system`. */
export function parseTheme(value: unknown): Theme {
  return THEMES.find((theme) => theme === value) ?? 'system'
}

function readCookie(): string | undefined {
  const entry = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${THEME_COOKIE}=`))

  return entry?.slice(THEME_COOKIE.length + 1)
}

/**
 * O tema salvo, lido onde a execução está: do header `Cookie` da requisição no
 * servidor, de `document.cookie` no navegador (`createIsomorphicFn`, nunca
 * `typeof window`).
 */
export const readTheme = createIsomorphicFn()
  .client((): Theme => parseTheme(readCookie()))
  .server((): Theme => parseTheme(server.themeCookie(THEME_COOKIE)))

/** Grava a preferência. Só no navegador, a partir de um clique. */
export function writeTheme(theme: Theme): void {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`
}

/** Escreve a classe resolvida no `<html>` e o `color-scheme` que o navegador usa nos controles. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')

  let resolved: 'light' | 'dark' = 'light'
  if (theme === 'dark') resolved = 'dark'
  if (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    resolved = 'dark'

  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

/** O script que resolve `system` antes da hidratação, para não piscar o tema errado. */
export const SYSTEM_THEME_SCRIPT = `(function(){try{var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=d?'dark':'light';var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`
