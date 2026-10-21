import type * as React from 'react'

import { cn } from '#/lib/utils'

/**
 * O crédito de quem fez o sistema: a marca da Maiyu e o nome, com link.
 *
 * Mora em `common` porque todo layout o mostra - o site, o painel e a entrada.
 * A cor vem de quem usa (`className`): o rodapé do site é escuro, o do painel
 * segue o tema.
 */
export function MaiyuCredit({
  className,
  ...rest
}: React.ComponentProps<'p'>): React.JSX.Element {
  return (
    <p
      data-slot="maiyu-credit"
      {...rest}
      className={cn('flex items-center justify-center gap-2', className)}
    >
      <img
        src="/maiyu.png"
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0"
      />
      <span>
        Desenvolvido por{' '}
        <a
          href="https://maiyu.com.br"
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline-offset-4 hover:underline"
        >
          Maiyu
        </a>{' '}
        - Consultoria e Desenvolvimento em Tecnologia
      </span>
    </p>
  )
}
