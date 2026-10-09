import type * as React from 'react'
import { TrophyIcon } from '@phosphor-icons/react'

import { cn } from '#/lib/utils'

/**
 * A marca dos jogos: troféu e o nome em itálico esportivo, como o cabeçalho do
 * site anterior.
 *
 * Não é um link: quem decide para onde ela leva é quem a usa.
 */
export function BrandMark({
  className,
  ...rest
}: React.ComponentProps<'span'>): React.JSX.Element {
  return (
    <span
      data-slot="brand-mark"
      {...rest}
      className={cn('flex items-center gap-2 leading-none', className)}
    >
      {/* Na barra lateral recolhida sobra só o troféu: o nome some da tela, e
          não do leitor de tela. Fora da barra o seletor não casa nada. */}
      <TrophyIcon
        className="text-accent size-7 shrink-0 group-data-[collapsible=icon]:size-5"
        weight="fill"
      />
      <span className="font-display text-xl font-extrabold uppercase italic group-data-[collapsible=icon]:sr-only">
        Jogos Estudantis
      </span>
    </span>
  )
}
