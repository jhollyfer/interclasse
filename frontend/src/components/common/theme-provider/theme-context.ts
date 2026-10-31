import * as React from 'react'

import type { Theme } from '#/lib/theme'

export type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = React.createContext<ThemeContextValue | null>(null)

/** The theme preference, for whoever is inside `ThemeProvider`. */
export function useTheme(consumer: string): ThemeContextValue {
  const context = React.use(ThemeContext)

  if (!context) {
    throw new Error(`\`${consumer}\` precisa estar dentro de \`ThemeProvider\``)
  }

  return context
}
