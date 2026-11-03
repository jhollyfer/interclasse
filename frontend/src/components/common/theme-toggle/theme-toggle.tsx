import { DesktopIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import * as React from 'react'

import { useTheme } from '#/components/common/theme-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/cn'
import { THEMES } from '#/lib/theme'
import type { Theme } from '#/lib/theme'
import { m } from '#/paraglide/messages'

const THEME_NAMES = {
  light: () => m.theme_light(),
  dark: () => m.theme_dark(),
  system: () => m.theme_system(),
} satisfies Record<Theme, () => string>

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonIcon,
  system: DesktopIcon,
} satisfies Record<Theme, React.ComponentType<{ className?: string }>>

function isTheme(value: string): value is Theme {
  return THEMES.some((theme) => theme === value)
}

/**
 * The theme choice: light, dark or follow the system (`frontend.md` §3.2). The preference is
 * the cookie the root `loader` reads, so the first HTML already comes out in the chosen theme.
 *
 * The trigger shows the **resolved** theme through the `dark` class on `<html>` (sun in light,
 * moon in dark), with both icons always mounted: the class is resolved before hydration, so
 * the first render never picks the wrong icon. The accessible name comes from the content, with
 * the same text in the menu title.
 */
export function ThemeToggle({
  className,
}: Readonly<{ className?: string }>): React.JSX.Element {
  const { theme, setTheme } = useTheme('ThemeToggle')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="theme-toggle"
        data-test-id="theme-toggle"
        className={cn(
          'relative flex size-11 items-center justify-center overflow-hidden rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8',
          className,
        )}
      >
        <span className="sr-only">{m.panel_toggle_theme()}</span>
        <SunIcon
          aria-hidden="true"
          weight="fill"
          className="absolute size-4 rotate-90 scale-0 transition-transform duration-300 motion-reduce:transition-none dark:rotate-0 dark:scale-100"
        />
        <MoonIcon
          aria-hidden="true"
          weight="fill"
          className="absolute size-4 rotate-0 scale-100 transition-transform duration-300 motion-reduce:transition-none dark:-rotate-90 dark:scale-0"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.panel_toggle_theme()}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value: string) => {
              if (isTheme(value)) setTheme(value)
            }}
          >
            {THEMES.map((option) => {
              const Icon = THEME_ICONS[option]

              return (
                <DropdownMenuRadioItem key={option} value={option}>
                  <Icon aria-hidden="true" className="size-4" />
                  {THEME_NAMES[option]()}
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
