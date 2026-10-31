import { ScriptOnce } from '@tanstack/react-router'
import * as React from 'react'

import { SYSTEM_THEME_SCRIPT, applyTheme, writeTheme } from '#/lib/theme'
import type { Theme } from '#/lib/theme'

import { ThemeContext } from './theme-context'

type ThemeProviderProps = Readonly<{
  /** The theme that the root `loader` read from the cookie. */
  theme: Theme
  children: React.ReactNode
}>

/**
 * The page's theme. The preference comes from the cookie (read on the server, with no flash)
 * and changes through `setTheme`, which saves the cookie and swaps the `<html>` class in
 * the same click. Only `system` needs a script before hydration, because only
 * the browser knows the system preference.
 * _doc-lib/shadcn.md#docs/dark-mode/tanstack-start.
 */
export function ThemeProvider({
  theme: initial,
  children,
}: ThemeProviderProps): React.JSX.Element {
  const [theme, setThemeState] = React.useState(initial)

  // `system` follows the operating system while the page is open.
  React.useEffect(() => {
    if (theme !== 'system') return

    const media = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => applyTheme('system')
    media.addEventListener('change', onChange)

    return () => media.removeEventListener('change', onChange)
  }, [theme])

  function setTheme(next: Theme): void {
    writeTheme(next)
    applyTheme(next)
    setThemeState(next)
  }

  return (
    <ThemeContext value={{ theme, setTheme }}>
      {theme === 'system' && <ScriptOnce>{SYSTEM_THEME_SCRIPT}</ScriptOnce>}
      {children}
    </ThemeContext>
  )
}
