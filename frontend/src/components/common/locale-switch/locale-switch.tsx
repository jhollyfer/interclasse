import { TranslateIcon } from '@phosphor-icons/react'
import type * as React from 'react'

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
import { m } from '#/paraglide/messages'
import { getLocale, isLocale, locales, setLocale } from '#/paraglide/runtime'
import type { Locale } from '#/paraglide/runtime'

/** Each language's name, in the screen's language. */
const LOCALE_NAMES = {
  'pt-BR': () => m.locale_pt_br(),
  es: () => m.locale_es(),
  en: () => m.locale_en(),
} satisfies Record<Locale, () => string>

/**
 * The language switch (_standards/i18n.md §2). Paraglide's `setLocale` leads to
 * the same page in the other language - the URL is the source of truth -, and the rest
 * (API message, validation, `<html lang>`) follows from it.
 */
/**
 * `visibleLabel`: the code (PT-BR) shows at every width. The compact header leaves it to the
 * icon below `sm`; the phone's menu panel has room, and an icon alone does not say what it does.
 */
const TRIGGER_SIZE: Record<string, string> = {
  true: 'min-h-11 px-3 py-1',
  false: 'size-11 sm:size-auto sm:px-2 sm:py-1',
}

const CODE_VISIBILITY: Record<string, string> = {
  true: '',
  false: 'max-sm:sr-only',
}

export function LocaleSwitch({
  className,
  visibleLabel = false,
}: Readonly<{
  className?: string
  visibleLabel?: boolean
}>): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          // Below `sm` only the icon shows, in a 44px target; the accessible name stays.
          'flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold uppercase transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
          TRIGGER_SIZE[String(visibleLabel)],
          className,
        )}
      >
        {/* Accessible name from the content, with the visible text inside: WCAG 2.5.3. */}
        <span className="sr-only">{m.locale_switch_label()}</span>
        <TranslateIcon aria-hidden="true" className="size-4" />
        <span className={CODE_VISIBILITY[String(visibleLabel)]}>
          {getLocale()}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.locale_switch_label()}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={getLocale()}
            onValueChange={(value: string) => {
              if (isLocale(value)) void setLocale(value)
            }}
          >
            {locales.map((locale) => (
              <DropdownMenuRadioItem key={locale} value={locale}>
                {LOCALE_NAMES[locale]()}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
