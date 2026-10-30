import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { TrophyIcon } from '@phosphor-icons/react'

import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import { cn } from '#/lib/utils'
import type { Merge } from '#/lib/merge'
import { m } from '#/paraglide/messages'

type NotFoundPageProps = Readonly<
  Merge<
    React.ComponentProps<'div'>,
    {
      /**
       * O número gigante do painel escuro. `404` por padrão porque é para isso
       * que a página nasceu; a fronteira de erro do router passa `500`, e sem
       * este parâmetro ela anunciaria "404" para uma falha de servidor.
       */
      code?: React.ReactNode
    }
  >
>

/**
 * A página de saída: rota não encontrada, e também erro não tratado.
 *
 * Sem children, escreve o 404 genérico. A tela que sabe **o que** não foi
 * encontrado troca as partes que quiser e deixa o resto - o passaporte diz que
 * o código tem dez caracteres, e isso não cabia numa prop de texto sem virar
 * mais uma prop de texto para as outras quatro.
 *
 * O título padrão era "Ops!". Além de ser o clichê que a direção bane por
 * nome, ele gastava a linha de maior peso da tela para não dizer nada: quem
 * chega aqui já sabe que algo deu errado, e o que precisa saber é **o quê**.
 */
export function NotFoundPage({
  className,
  code = '404',
  children,
  ...props
}: NotFoundPageProps): React.JSX.Element {
  return (
    <div
      data-slot="not-found-page"
      className={cn('grid min-h-[70dvh] grid-cols-1 md:grid-cols-2', className)}
      {...props}
    >
      <div className="flex flex-col justify-center bg-background px-8 py-12 md:px-16">
        {children ?? (
          <>
            <NotFoundPageTitle>{m.common_not_found_title()}</NotFoundPageTitle>
            <NotFoundPageSubtitle>
              {m.common_not_found_subtitle()}
            </NotFoundPageSubtitle>
            <NotFoundPageDescription>
              {m.common_not_found_description()}
            </NotFoundPageDescription>
            <NotFoundPageActions>
              <NotFoundPageHomeButton />
            </NotFoundPageActions>
          </>
        )}
      </div>

      {/* O placar do site, e não um painel preto genérico: o troféu em cima,
          o código embaixo, sem um cobrir o outro. */}
      <div className="hero relative flex h-[40dvh] flex-col items-center justify-center gap-4 overflow-hidden text-brand-ink-foreground md:h-auto md:rounded-l-3xl">
        <TrophyIcon className="text-brand size-16 md:size-20" weight="fill" />
        <span className="font-display text-brand text-[7rem] leading-none font-extrabold italic select-none md:text-[9rem]">
          {code}
        </span>
      </div>
    </div>
  )
}

export function NotFoundPageTitle({
  className,
  ...props
}: React.ComponentProps<'h1'>): React.JSX.Element {
  return (
    <h1
      data-slot="not-found-page-title"
      className={cn(
        'text-4xl font-bold text-foreground md:text-5xl',
        className,
      )}
      {...props}
    />
  )
}

export function NotFoundPageSubtitle({
  className,
  ...props
}: React.ComponentProps<'p'>): React.JSX.Element {
  return (
    <p
      data-slot="not-found-page-subtitle"
      className={cn(
        'mt-2 text-xl font-semibold text-foreground md:text-2xl',
        className,
      )}
      {...props}
    />
  )
}

export function NotFoundPageDescription({
  className,
  ...props
}: React.ComponentProps<'p'>): React.JSX.Element {
  return (
    <p
      data-slot="not-found-page-description"
      className={cn('mt-4 max-w-md text-muted-foreground', className)}
      {...props}
    />
  )
}

export function NotFoundPageActions({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element | null {
  if (!children) return null

  return (
    // Cada ação num grupo aninhado, como em `PageHeaderActions`: o
    // `ButtonGroup` cola os filhos diretos, e estas são saídas independentes -
    // "voltar ao início" e "tentar de novo" não formam um controle segmentado.
    <ButtonGroup
      data-slot="not-found-page-actions"
      className={cn('mt-8 flex-wrap items-center', className)}
      {...props}
    >
      {React.Children.map(children, (action) => {
        if (!action) return null

        return <ButtonGroup>{action}</ButtonGroup>
      })}
    </ButtonGroup>
  )
}

/**
 * A saída padrão: voltar ao início.
 *
 * `to` segue prop - é destino de navegação, não markup - e como `Link` o botão
 * responde a abrir em nova aba, ao clique do meio e ao menu de contexto.
 */
export function NotFoundPageHomeButton({
  to = '/',
  children = m.common_back_home(),
}: Readonly<{
  to?: string
  children?: React.ReactNode
}>): React.JSX.Element {
  return (
    <Button
      data-slot="not-found-page-home-button"
      size="lg"
      className="w-fit"
      render={<Link to={to}>{children}</Link>}
    />
  )
}
