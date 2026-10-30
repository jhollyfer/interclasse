import type { Merge } from '@interclasse/shared'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import * as React from 'react'

import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/**
 * A casca de uma tela do painel: cabeçalho fixo, conteúdo que rola, rodapé fixo.
 *
 * O que ela resolve é uma coisa só, e é a que mais dá trabalho em CSS: a
 * paginação parar de descer junto com a lista. Sem ela a tela inteira rola, e a
 * paginação de uma lista de 50 linhas fica abaixo da dobra - para trocar de
 * página é preciso rolar até o fim, e ao chegar na página seguinte rolar de
 * volta ao topo.
 *
 * A corrente de `min-h-0` é o que faz isso funcionar: um filho `flex` não encolhe
 * abaixo do próprio conteúdo por default, então sem ele o `overflow-auto` do
 * meio nunca recebe altura limitada e o scroll vaza para fora.
 *
 * Compound e não uma prop `header`/`footer`: os slots aceitam qualquer coisa, e
 * a ordem no JSX é a ordem na tela.
 */
type PageShellProps = Readonly<
  Merge<
    Omit<React.ComponentProps<'div'>, 'children'>,
    { children: React.ReactNode }
  >
>

export function PageShell({
  children,
  className,
  ...props
}: PageShellProps): React.JSX.Element {
  return (
    <div
      data-slot="page-shell"
      // `min-h-0 flex-1` e não `h-full`: dentro de um pai flex com altura ela
      // preenche o que sobra; fora de um, ela simplesmente flui. `h-full`
      // resolveria para `auto` no segundo caso e o `overflow-hidden`
      // recortaria o conteúdo.
      // No celular, a lista de cards rolava numa caixa de meia tela dentro da
      // página. Ali quem rola passa a ser a página: o shell cresce com o
      // conteúdo. Só com lista (`has-`), porque nos formulários o `Salvar` mora
      // no cabeçalho e tem de continuar à vista.
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-4 overflow-hidden',
        'max-sm:has-data-[slot=table-mobile-cards]:flex-none max-sm:has-data-[slot=table-mobile-cards]:overflow-visible',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// A linha divisória é sempre desenhada: quem não a quer passa `border-b-0`
// em `className`, e o `cn` resolve o conflito - estrutura não vira prop.
type PageShellHeaderProps = Readonly<
  Merge<
    Omit<React.ComponentProps<'div'>, 'children'>,
    { readonly children: React.ReactNode }
  >
>

export function PageShellHeader({
  children,
  className,
  ...props
}: PageShellHeaderProps): React.JSX.Element {
  return (
    <div
      data-slot="page-shell-header"
      className={cn(
        'flex shrink-0 flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * A área que rola de toda tela do painel.
 *
 * **`data-scroll-restoration-id` é o que dá nome a esta rolagem.** O router
 * salva a posição de qualquer elemento que role, mas sem um id ele identifica
 * o elemento por um seletor posicional montado subindo a árvore com índices de
 * `nth-child`. Basta a página renderizar com um filho a mais numa visita - o
 * aviso de "nenhum depoimento aguardando análise" do painel inicial é
 * condicional - para o seletor gravado não casar mais com o elemento, e a volta
 * cair no topo da lista em vez de onde a pessoa estava.
 *
 * Constante e não derivado da rota: só existe uma destas por tela, e o router
 * guarda a posição por chave de localização, não por id.
 */
const SCROLL_ID = 'page-shell-content'

export function PageShellContent({
  children,
  className,
  ...props
}: PageShellProps): React.JSX.Element {
  return (
    <div
      data-slot="page-shell-content"
      data-scroll-restoration-id={SCROLL_ID}
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-auto',
        'max-sm:has-data-[slot=table-mobile-cards]:flex-none max-sm:has-data-[slot=table-mobile-cards]:overflow-visible',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type PageShellFooterProps = Readonly<
  Merge<
    Omit<React.ComponentProps<'div'>, 'children'>,
    { children?: React.ReactNode }
  >
>

export function PageShellFooter({
  children,
  className,
  ...props
}: PageShellFooterProps): React.JSX.Element {
  return (
    <div
      data-slot="page-shell-footer"
      className={cn('shrink-0 border-t pt-3', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * O título de uma tela, com voltar opcional à esquerda e ações à direita.
 *
 * Separado do `PageShellHeader` porque nem todo cabeçalho é um título: o de uma
 * tela de formulário em passos tem outra coisa ali.
 *
 * Slots e não props de texto porque as telas não concordam sobre o que vai
 * aqui: umas não voltam para lugar nenhum, outras têm três botões à direita, e
 * a ficha de uma notícia mostra dois badges que a de um depoimento não tem. Com
 * prop, cada variação dessas vira mais uma prop opcional aqui dentro.
 *
 * A grade tem três colunas fixas - `[auto_1fr_auto]` - e cada parte declara
 * onde entra. Assim a ordem no JSX não decide o layout, e a coluna de uma parte
 * ausente colapsa para largura zero sozinha, sem `has-data-[...]`.
 */
export function PageHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="page-header"
      className={cn(
        // Sem o "voltar", a coluna 1 fica vazia e o `gap-x` ainda a separava do
        // título: 12px de recuo que nenhum outro bloco da tela tinha.
        'grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-0 gap-y-0.5 has-[[data-slot$=-back]]:gap-x-3',
        className,
      )}
      {...props}
    />
  )
}

type PageHeaderBackProps = Readonly<{
  /**
   * Para onde o botão de voltar aponta.
   *
   * Uma rota, e não um callback: voltar é navegação, e como `Link` ele responde
   * a abrir em nova aba, ao clique do meio e ao menu de contexto. Um `onClick`
   * com `navigate()` não faz nada disso. Por isso segue prop e não slot - é
   * destino, não markup.
   */
  to: LinkProps['to']
  params?: LinkProps['params']
  /** A parte de outro compound que é esta seta (`form-shell-back`). */
  'data-slot'?: `${string}-back`
}>

/** A seta de voltar. A tela que não veio de lugar nenhum simplesmente não a escreve. */
export function PageHeaderBack({
  to,
  params,
  'data-slot': slot = 'page-header-back',
}: PageHeaderBackProps): React.JSX.Element {
  return (
    <Button
      data-slot={slot}
      variant="ghost"
      size="icon"
      type="button"
      aria-label={m.common_back()}
      className="col-start-1 row-span-2 row-start-1 self-center"
      render={
        <Link to={to} params={params}>
          <ArrowLeftIcon />
        </Link>
      }
    />
  )
}

export function PageHeaderTitle({
  className,
  children,
  ...props
}: React.ComponentProps<'h1'>): React.JSX.Element {
  return (
    <h1
      data-slot="page-header-title"
      className={cn(
        'col-start-2 row-start-1 flex flex-wrap items-center gap-3 text-2xl font-bold',
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

/**
 * Os badges à direita do título, na mesma linha.
 *
 * Parte própria, e não texto solto dentro do título: o `<span>` isola o que é
 * estado do que é nome. Para quem lê a tela por leitor de tela, "Semana da
 * Consciência Negra Publicada Arquivada" viraria o nome do registro.
 */
export function PageHeaderBadges({
  className,
  children,
  ...props
}: React.ComponentProps<'span'>): React.JSX.Element | null {
  if (!children) return null

  return (
    <span
      data-slot="page-header-badges"
      className={cn(
        'flex flex-wrap items-center gap-3 text-base font-normal',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/** Some quando a tela não tem o que explicar. */
export function PageHeaderDescription({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element | null {
  if (!children) return null

  return (
    <div
      data-slot="page-header-description"
      className={cn(
        'col-start-2 row-start-2 text-xs text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * As ações da direita: criar, editar, arquivar, exportar - uma, três ou
 * nenhuma. `flex-wrap` porque três botões não cabem lado a lado no telefone.
 *
 * Cada ação entra num `ButtonGroup` próprio, e não solta no grupo de fora: o
 * `ButtonGroup` **cola** os filhos diretos - tira o arredondamento da direita e
 * a borda da esquerda - e é assim que se desenha um controle segmentado. Estas
 * ações não são um controle só; são botões independentes que às vezes quebram
 * linha. Um filho sozinho no grupo aninhado recebe o arredondamento de volta
 * pela regra `:not(:has(~[data-slot]))`, então desenha igual a um `Button` solto,
 * e o grupo de fora reconhece os aninhados e devolve o `gap-2`.
 */
export function PageHeaderActions({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element | null {
  if (!children) return null

  return (
    <ButtonGroup
      data-slot="page-header-actions"
      className={cn(
        // No celular as ações descem para a linha de baixo: na mesma linha do
        // título elas o espremiam em três linhas.
        'col-span-full row-start-3 flex-wrap items-center justify-start max-sm:mt-2 sm:col-span-1 sm:ml-3 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:justify-end sm:self-center',
        className,
      )}
      {...props}
    >
      {React.Children.map(children, (action) => {
        if (!action) return null

        return <ButtonGroup>{action}</ButtonGroup>
      })}
    </ButtonGroup>
  )
}
