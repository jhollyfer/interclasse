import { ScriptOnce } from '@tanstack/react-router'
import * as React from 'react'

import { SYSTEM_THEME_SCRIPT, applyTheme, writeTheme } from '#/lib/theme'
import type { Theme } from '#/lib/theme'

import { ThemeContext } from './theme-context'

type ThemeProviderProps = Readonly<{
  /** O tema que o `loader` da raiz leu do cookie. */
  theme: Theme
  children: React.ReactNode
}>

/**
 * O tema da página. A preferência vem do cookie (lido no servidor, sem flash)
 * e muda por `setTheme`, que grava o cookie e troca a classe do `<html>` no
 * mesmo clique. Só `system` precisa de script antes da hidratação, porque só
 * o navegador sabe a preferência do sistema.
 * _doc-lib/shadcn.md#docs/dark-mode/tanstack-start.
 */
export function ThemeProvider({
  theme: initial,
  children,
}: ThemeProviderProps): React.JSX.Element {
  const [theme, setThemeState] = React.useState(initial)

  // `system` acompanha o sistema operacional enquanto a página está aberta.
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
