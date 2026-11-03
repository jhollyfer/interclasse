import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import * as React from 'react'

import { useTheme } from '#/components/common/theme-provider'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { m } from '#/paraglide/messages'

/**
 * Toggles between light and dark.
 *
 * Both icons stay **always mounted**, stacked, and the switch is `rotate` +
 * `scale` from one to the other. Mounting and unmounting according to the theme would give the same
 * static result and no transition - and, on the server's first render, would
 * still pick the wrong icon.
 *
 * That is also why there is no `if (!mounted) return null`: the resolved theme only
 * exists on the client, but nothing here depends on it to render. Whoever decides
 * which icon appears is the `dark` class on `<html>`, which the `ThemeProvider`
 * script resolves before hydration.
 */
export function ThemeToggle(): React.JSX.Element {
  const { setTheme } = useTheme('ThemeToggle')

  function toggle(): void {
    // The resolved theme is what the page shows now (the `<html>` class):
    // with `system` the saved preference does not say whether it is light or dark.
    let next: 'light' | 'dark' = 'dark'
    if (document.documentElement.classList.contains('dark')) next = 'light'

    setTheme(next)
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            data-slot="theme-toggle"
            data-test-id="theme-toggle"
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={m.panel_toggle_theme()}
            className="relative overflow-hidden"
          >
            <SunIcon
              weight="fill"
              className="absolute rotate-90 scale-0 transition-transform duration-300 motion-reduce:transition-none dark:rotate-0 dark:scale-100"
            />
            <MoonIcon
              weight="fill"
              className="absolute rotate-0 scale-100 transition-transform duration-300 motion-reduce:transition-none dark:-rotate-90 dark:scale-0"
            />
          </Button>
        }
      />
      <TooltipContent side="bottom">{m.panel_toggle_theme()}</TooltipContent>
    </Tooltip>
  )
}
