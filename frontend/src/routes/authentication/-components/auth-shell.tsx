import type * as React from 'react'
import { Link } from '@tanstack/react-router'

import { BrandMark } from '#/components/common/brand-mark'
import { MaiyuCredit } from '#/components/common/maiyu-credit'
import { cn } from '#/lib/utils'
import type { Merge } from '#/lib/merge'

/**
 * A moldura das telas de autenticação: lateral de marca à esquerda e o
 * formulário à direita. Abaixo de `lg` a lateral some inteira e sobra só o logo
 * no topo.
 *
 * **Só a moldura.** O que aparece na lateral e a largura da coluna de conteúdo
 * são partes, e cada tela escreve as que tem.
 *
 * **Sem contexto:** não há estado a compartilhar entre as partes - cada uma se
 * basta, e a skill manda não inventar provider sem ele. Pelo mesmo motivo elas
 * cabem num arquivo só: a regra da pasta existe para o contexto e o hook-guard
 * morarem separados, e aqui não há nem um nem outro.
 */
function AuthShell({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="auth-shell"
      className={cn('min-h-dvh lg:grid lg:grid-cols-12', className)}
      {...props}
    />
  )
}

/**
 * A coluna de marca. Some abaixo de `lg`, e some sem children.
 *
 * O escuro é o `--brand-ink` da associação, e não o `bg-muted` do esqueleto:
 * este painel é o único lugar do produto em que a marca aparece do tamanho
 * dela, e o creme do tema claro apagava o selo âmbar contra o fundo. Ele não
 * inverte com o tema - o institucional é escuro nos dois -, então a coluna
 * declara a própria tinta clara e a marca a herda.
 *
 * Os dois cantos em L vêm do frontend anterior: são o que dá moldura ao painel
 * sem desenhar borda em volta dele.
 */
function AuthShellAside({
  className,
  children,
  ...props
}: React.ComponentProps<'aside'>): React.JSX.Element | null {
  if (!children) return null

  return (
    <aside
      data-slot="auth-shell-aside"
      className={cn(
        'relative hidden overflow-hidden bg-brand-ink text-primary-foreground lg:col-span-5 lg:flex lg:flex-col lg:justify-center lg:p-8',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-8 right-8 size-16 border-t border-r border-brand/20"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-8 left-8 size-16 border-b border-l border-brand/20"
      />
      {children}
    </aside>
  )
}

/** A marca. Aparece na lateral e, abaixo de `lg`, no topo do conteúdo. */
function AuthShellBrand({
  className,
  ...props
}: React.ComponentProps<'span'>): React.JSX.Element {
  return (
    // Link para o site: quem caiu na entrada por engano volta sem digitar URL.
    <Link to="/" aria-label="Jogos Estudantis - voltar ao site">
      <BrandMark
        data-slot="auth-shell-brand"
        className={className}
        {...props}
      />
    </Link>
  )
}

/**
 * O título da tela e a linha que o explica.
 *
 * Era `<header>` com `h1` e `p` escritos à mão em cada tela. Uma tela sem `h1` é
 * uma tela sem nome para quem navega por cabeçalhos.
 */
function AuthShellHeader({
  className,
  title,
  children,
  ...props
}: Merge<
  React.ComponentProps<'header'>,
  { title: React.ReactNode }
>): React.JSX.Element {
  return (
    <header
      data-slot="auth-shell-header"
      className={cn('flex flex-col gap-1', className)}
      {...props}
    >
      <h1 className="text-2xl leading-tight font-bold">{title}</h1>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
    </header>
  )
}

/**
 * O miolo centrado da lateral: a marca no tamanho dela e a frase sob ela.
 *
 * Centrado nos dois eixos, como no frontend anterior
 * (`frontend-old/components/composition/auth-shell/index.tsx`, `AuthShell.Brand`):
 * a lateral não é um cabeçalho com conteúdo embaixo, é uma peça só - marca e
 * nome por extenso - no meio de um retângulo escuro. Com a marca pendurada no
 * topo ela ficava encostada na quina esquerda, longe da frase que a explica.
 */
function AuthShellAsideBody({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="auth-shell-aside-body"
      className={cn(
        'relative z-10 flex flex-1 flex-col items-center justify-center gap-6 py-10',
        className,
      )}
      {...props}
    />
  )
}

/** A frase sob a marca: o nome da associação por extenso. */
function AuthShellTagline({
  className,
  children,
  ...props
}: React.ComponentProps<'p'>): React.JSX.Element | null {
  if (!children) return null

  return (
    <p
      data-slot="auth-shell-tagline"
      className={cn(
        // A mesma largura da marca acima (`max-w-[320px]` na tela de entrada):
        // as duas peças formam um bloco só, e uma frase mais estreita que o
        // desenho leria como desalinhada em vez de centrada.
        'max-w-[320px] text-center text-sm leading-relaxed font-light tracking-wide text-primary-foreground/60',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  )
}

/**
 * A coluna do formulário.
 *
 * O `className` mira a largura do conteúdo, e não o `<main>`: é o que cada tela
 * ajusta. O cabeçalho com o logo abaixo de `lg` fica aqui dentro - é
 * responsividade da moldura, não escolha da tela -, e sobre o escuro
 * institucional, que é onde o selo âmbar se lê melhor.
 */
function AuthShellContent({
  className,
  children,
  ...props
}: React.ComponentProps<'main'>): React.JSX.Element {
  return (
    <main
      data-slot="auth-shell-content"
      // `min-h-dvh` também abaixo de `lg`: sem altura, o `justify-center` não
      // tinha o que centralizar e o formulário grudava no topo.
      className="flex min-h-dvh flex-col lg:col-span-7"
      {...props}
    >
      <header className="flex justify-center bg-brand-ink p-4 text-primary-foreground lg:hidden">
        <AuthShellBrand className="h-10 w-auto" />
      </header>

      <div
        className={cn(
          'm-auto flex w-full max-w-md flex-col gap-8 px-6 py-10',
          className,
        )}
      >
        {children}
      </div>
      <footer className="text-muted-foreground px-6 py-4 text-xs [&_a]:text-foreground">
        <MaiyuCredit />
      </footer>
    </main>
  )
}

export {
  AuthShell,
  AuthShellAside,
  AuthShellAsideBody,
  AuthShellBrand,
  AuthShellContent,
  AuthShellHeader,
  AuthShellTagline,
}
