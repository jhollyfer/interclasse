import { createIsomorphicFn } from '@tanstack/react-start'

import { getThemeCookie } from '#/integrations/theme/get-theme'

/**
 * Light/dark theme (`frontend.md` §3.2, §6): the preference lives in a cookie
 * that the server reads in the root `loader`, so the first HTML already comes out with the
 * right class and no flash. _doc-lib/shadcn.md#docs/dark-mode/tanstack-start.
 */
export const THEME_COOKIE = 'theme'

const ONE_YEAR = 60 * 60 * 24 * 365

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]

/** The class the `<html>` carries. `system` has none: the script before hydration decides. */
export const THEME_CLASS = {
  light: 'light',
  dark: 'dark',
  system: '',
} as const satisfies Record<Theme, string>

/** A missing or crooked cookie counts as `system`. */
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
 * The saved theme, read where execution is: from the request's `Cookie` header on the
 * server, from `document.cookie` in the browser (`createIsomorphicFn`, never
 * `typeof window`).
 */
export const readTheme = createIsomorphicFn()
  .client((): Theme => parseTheme(readCookie()))
  .server((): Theme => parseTheme(getThemeCookie(THEME_COOKIE)))

/** Saves the preference. Browser only, from a click. */
export function writeTheme(theme: Theme): void {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`
}

/** Writes the resolved class on `<html>` and the `color-scheme` the browser uses on controls. */
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

/** The script that resolves `system` before hydration, to avoid flashing the wrong theme. */
export const SYSTEM_THEME_SCRIPT = `(function(){try{var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=d?'dark':'light';var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`
