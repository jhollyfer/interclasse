import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'

import { BrandMark } from '#/components/common/brand-mark'
import { LocaleSwitch } from '#/components/common/locale-switch'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { AUTHENTICATION, NAVIGATION } from './menu'
import type { MenuItem } from './menu'

/**
 * A pílula de cada destino: na faixa do topo (`bar`) ou no painel do celular
 * (`panel`). Variante de estilo do próprio link, via `cva`, e não prop
 * booleana de estrutura.
 */
const navigationLinkVariants = cva(
  'font-medium transition-colors duration-200 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        bar: 'rounded-full px-4 py-1.5 text-sm',
        panel: 'block rounded-lg px-4 py-3 text-base',
      },
    },
    defaultVariants: { variant: 'bar' },
  },
)

type NavigationLinkVariant = NonNullable<
  VariantProps<typeof navigationLinkVariants>['variant']
>

/**
 * O item ativo é o âmbar da marca, e o inativo é a tinta clara esmaecida sobre
 * o verde-noite. Não é `text-foreground`: esta faixa não inverte com o tema -
 * ela é escura nos dois -, então a tinta é o token da faixa.
 */
const ACTIVE = {
  bar: 'bg-brand text-brand-ink font-semibold',
  panel: 'text-brand font-semibold',
} satisfies Record<NavigationLinkVariant, string>

const INACTIVE = {
  bar: 'text-brand-ink-foreground/70 hover:bg-brand-ink-foreground/10 hover:text-brand-ink-foreground',
  panel:
    'text-brand-ink-foreground/70 hover:bg-brand-ink-foreground/5 hover:text-brand-ink-foreground',
} satisfies Record<NavigationLinkVariant, string>

/** O painel do menu: aberto ocupa altura, fechado sai do fluxo de foco. */
const MENU_PANEL: Record<string, string> = {
  true: 'py-6',
  false: 'invisible',
}

/** Um destino da navegação, na faixa do topo ou no painel do celular. */
type NavigationLinkProps = Readonly<{
  item: MenuItem
  variant?: NavigationLinkVariant
  onNavigate?: () => void
}>

function NavigationLink({
  item,
  variant = 'bar',
  onNavigate,
}: NavigationLinkProps): React.JSX.Element {
  return (
    <Link
      data-slot="public-header-link"
      to={item.to}
      // `exact` para a home: sem ele `/` casaria com toda tela da vitrine, e
      // "Início" ficaria aceso o site inteiro.
      activeOptions={{ exact: item.to === '/' }}
      // `inactiveProps` e não `className`: o Router soma `className` com
      // `activeProps`, e as duas cores juntas deixavam o texto branco sobre o
      // amarelo no item ativo.
      className={navigationLinkVariants({ variant })}
      activeProps={{ className: ACTIVE[variant] }}
      inactiveProps={{ className: INACTIVE[variant] }}
      onClick={onNavigate}
    >
      {item.label()}
    </Link>
  )
}

/**
 * O cabeçalho da vitrine: faixa escura fixa no topo, com a marca à esquerda, a
 * navegação em pílula ao centro e a porta do painel à direita.
 *
 * Fixa e não estática, como no frontend anterior: as páginas públicas são
 * longas - a home tem seis seções - e a navegação some da vista logo no
 * primeiro rolar. `backdrop-blur` porque a faixa é translúcida e o conteúdo
 * passa por baixo dela.
 *
 * A faixa de pílulas aparece a partir de `xl`, e não de `lg`. São oito
 * destinos mais a porta do painel, e nos 1024px do `lg` eles não cabem ao lado
 * da marca sem espremer a pílula até a linha quebrar. Abaixo disso quem
 * responde é o painel do hamburguer, que lista os mesmos oito em coluna, com
 * espaço de sobra. Esconder um pedaço da faixa até `xl` é o que a referência
 * faz com o seletor de território do topo (`hidden xl:flex`).
 *
 * O menu móvel é `useState` e CSS, e não uma biblioteca de animação: o
 * frontend anterior trazia `framer-motion` só para as três barras do
 * hamburguer e para a altura do painel, e as duas coisas são uma transição de
 * `transform` e de `grid-template-rows`. O `prefers-reduced-motion` global de
 * `styles.css` alcança as duas.
 */
export function Header(): React.JSX.Element {
  const [open, setOpen] = React.useState(false)

  let menuLabel = m.public_menu_open()
  if (open) menuLabel = m.public_menu_close()

  function close(): void {
    setOpen(false)
  }

  return (
    <header
      data-slot="public-header"
      className="fixed top-0 left-0 z-50 w-full border-b border-brand-ink-foreground/5 bg-brand-ink/95 backdrop-blur-md"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          to="/"
          className="flex shrink-0 items-center text-brand-ink-foreground"
        >
          <BrandMark />
        </Link>

        <nav
          data-slot="public-header-navigation"
          className="hidden items-center gap-1 rounded-full border border-brand-ink-foreground/10 bg-brand-ink-foreground/5 px-2 py-1.5 md:flex"
        >
          {NAVIGATION.map((item) => (
            <NavigationLink key={item.to} item={item} />
          ))}

          <Link
            to={AUTHENTICATION.to}
            className={cn(
              navigationLinkVariants({ variant: 'bar' }),
              'ml-2 bg-brand font-semibold text-brand-ink active:scale-[0.97]',
            )}
          >
            {AUTHENTICATION.label()}
          </Link>
          <LocaleSwitch className="ml-1 text-brand-ink-foreground hover:bg-brand-ink-foreground/10" />
        </nav>

        {/*
          O hamburguer que vira X. As três barras são `<span>` com `transform`:
          a de cima gira e desce, a do meio encolhe até sumir, a de baixo gira e
          sobe. `origin-center` para as duas diagonais se cruzarem no meio.
        */}
        <button
          type="button"
          data-slot="public-header-toggle"
          data-open={open || undefined}
          aria-expanded={open}
          aria-label={menuLabel}
          onClick={() => setOpen((previous) => !previous)}
          className="group flex size-8 flex-col items-center justify-center gap-[5px] text-brand-ink-foreground md:hidden"
        >
          <span className="block h-px w-5 origin-center bg-current transition-transform duration-250 group-data-open:translate-y-[7px] group-data-open:rotate-45 motion-reduce:transition-none" />
          <span className="block h-px w-5 origin-center bg-current transition-transform duration-200 group-data-open:scale-x-0 motion-reduce:transition-none" />
          <span className="block h-px w-5 origin-center bg-current transition-transform duration-250 group-data-open:-translate-y-[7px] group-data-open:-rotate-45 motion-reduce:transition-none" />
        </button>
      </div>

      {/*
        O painel móvel. `grid-rows-[0fr]` para `[1fr]` anima a altura sem que
        ninguém precise medi-la - é o truque de CSS que substitui o
        `height: auto` que a transição não sabe animar. `invisible` no fechado
        porque altura zero com `overflow-hidden` ainda deixa o link focável.
      */}
      <div
        data-slot="public-header-mobile"
        data-open={open || undefined}
        className="grid grid-rows-[0fr] overflow-hidden border-brand-ink-foreground/10 opacity-0 transition-[grid-template-rows,opacity] duration-300 data-open:grid-rows-[1fr] data-open:border-t data-open:opacity-100 motion-reduce:transition-none md:hidden"
        aria-hidden={!open}
      >
        <nav
          className={cn(
            'container mx-auto flex min-h-0 flex-col gap-1 px-4',
            MENU_PANEL[String(open)],
          )}
        >
          {NAVIGATION.map((item) => (
            <NavigationLink
              key={item.to}
              item={item}
              variant="panel"
              onNavigate={close}
            />
          ))}

          <Link
            to={AUTHENTICATION.to}
            onClick={close}
            className={cn(
              navigationLinkVariants({ variant: 'panel' }),
              'mt-3 rounded-full bg-brand text-center font-semibold text-brand-ink active:scale-[0.97]',
            )}
          >
            {AUTHENTICATION.label()}
          </Link>
          <LocaleSwitch className="mt-2 self-start text-brand-ink-foreground hover:bg-brand-ink-foreground/10" />
        </nav>
      </div>
    </header>
  )
}
