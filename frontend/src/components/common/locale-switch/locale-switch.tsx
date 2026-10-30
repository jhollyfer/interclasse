import type * as React from 'react'
import { TranslateIcon } from '@phosphor-icons/react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { m } from '#/paraglide/messages'
import { getLocale, isLocale, locales, setLocale } from '#/paraglide/runtime'
import type { Locale } from '#/paraglide/runtime'
import { cn } from '#/lib/cn'

/** O nome de cada idioma, no idioma da tela. */
const LOCALE_NAMES = {
  'pt-BR': () => m.locale_pt_br(),
  es: () => m.locale_es(),
  en: () => m.locale_en(),
} satisfies Record<Locale, () => string>

/**
 * A troca de idioma (_standards/i18n.md §2). `setLocale` do Paraglide leva para
 * a mesma página no outro idioma - a URL é a fonte da verdade -, e o resto
 * (mensagem da API, validação, `<html lang>`) segue por ela.
 */
export function LocaleSwitch({
  className,
}: Readonly<{ className?: string }>): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={m.locale_switch_label()}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold uppercase transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
      >
        <TranslateIcon className="size-4" />
        {getLocale()}
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
