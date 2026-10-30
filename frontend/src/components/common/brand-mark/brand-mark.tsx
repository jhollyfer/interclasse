import type * as React from 'react'

import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/**
 * A marca dos jogos: a logo do 2º JIC e o nome em itálico esportivo.
 *
 * A logo é decorativa (`alt` vazio): o nome ao lado já diz o que ela diz, e
 * repeti-lo faria o leitor de tela ler a marca duas vezes.
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
      {/* Na barra lateral recolhida sobra só a logo: o nome some da tela, e
          não do leitor de tela. Fora da barra o seletor não casa nada. */}
      <img
        src="/logo-128.png"
        alt=""
        width={40}
        height={40}
        className="size-10 shrink-0 group-data-[collapsible=icon]:size-7"
      />
      <span className="font-display text-xl font-extrabold uppercase italic group-data-[collapsible=icon]:sr-only">
        {m.common_brand_name()}
      </span>
    </span>
  )
}
