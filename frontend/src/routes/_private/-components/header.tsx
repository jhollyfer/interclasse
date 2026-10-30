import { CaretDownIcon } from '@phosphor-icons/react'
import { getRouteApi, Link, useMatches } from '@tanstack/react-router'
import * as React from 'react'

import { LocaleSwitch } from '#/components/common/locale-switch'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Separator } from '#/components/ui/separator'
import { SidebarTrigger } from '#/components/ui/sidebar'
import { buildBreadcrumbs } from '#/lib/breadcrumbs'
import { createConfirmHandle } from '#/lib/dialog-handle'
import { initials } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import {
  SignOutConfirm,
  SignOutConfirmFooter,
  SignOutConfirmHeader,
} from './sign-out-confirm'
import { ThemeToggle } from './theme-toggle'

const route = getRouteApi('/_private')

/**
 * A trilha da tela atual.
 *
 * `useMatches()` e não `location.pathname`: a lista de rotas que casaram é o que
 * diz quais prefixos existem de verdade. A regra inteira mora em
 * `lib/breadcrumbs.ts`, testada lá.
 */
function Trail(): React.JSX.Element {
  const matches = useMatches()
  const crumbs = buildBreadcrumbs(matches)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <React.Fragment key={crumb.label.concat(String(index))}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.to && (
                <BreadcrumbLink render={<Link to={crumb.to} />}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
              {!crumb.to && <BreadcrumbPage>{crumb.label}</BreadcrumbPage>}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/**
 * O menu da conta: quem está logado, o caminho para a própria conta e a saída.
 *
 * O nome e o avatar vêm do **contexto da rota**, que o `beforeLoad` de
 * `_private/layout.tsx` encheu com `queryClient.query()`. Aqui não sai requisição
 * nova, e o cabeçalho nunca renderiza um instante sem nome.
 */
function AccountMenu(): React.JSX.Element {
  const { account } = route.useRouteContext()
  const [signOutHandle] = React.useState(createConfirmHandle)

  return (
    <React.Fragment>
      <DropdownMenu>
        {/*
        `render`, e não aninhamento: o gatilho já é um `<button>`, e outro botão
        por dentro dele seria um botão dentro de outro - erro de hidratação.
      */}
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted"
        >
          <Avatar className="size-7">
            <AvatarImage src={account.avatar?.url} alt="" />
            <AvatarFallback
              aria-hidden="true"
              className="bg-brand text-xs font-semibold text-brand-ink"
            >
              {initials(account.name)}
            </AvatarFallback>
          </Avatar>
          {/* Nome acessível pelo conteúdo, com o nome visível dentro: WCAG 2.5.3. */}
          <span className="sr-only">{m.panel_account_label()}</span>
          <span className="sr-only text-xs leading-none font-semibold lg:not-sr-only">
            {account.name}
          </span>
          <CaretDownIcon className="size-3 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" align="end">
          {/* `DropdownMenuLabel` é o `Menu.GroupLabel` do Base UI e exige o
            `Menu.Group` em volta: sem ele, abrir o menu lança "MenuGroupContext
            is missing" e o ErrorBoundary do layout mostra a página de erro. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate font-medium">{account.name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {account.email}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={<Link to="/profile">{m.panel_my_profile()}</Link>}
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOutHandle.open(null)}>
            {m.panel_sign_out()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Irmão do menu, e não dentro do conteúdo: o conteúdo desmonta ao fechar
        e levaria o alerta junto (`frontend.md` §6.2). */}
      <SignOutConfirm handle={signOutHandle}>
        <SignOutConfirmHeader />
        <SignOutConfirmFooter />
      </SignOutConfirm>
    </React.Fragment>
  )
}

/**
 * O cabeçalho do painel: o gatilho da barra lateral, a trilha, o tema e a conta.
 *
 * Componente próprio, e não markup solto no layout como na referência: aqui ele
 * carrega o menu da conta, que é estado e mutation - e o layout é o lugar do
 * guard, não da tela.
 */
export function Header(): React.JSX.Element {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Trail />
      </div>
      <div className="ml-auto flex items-center gap-2 px-4">
        <LocaleSwitch />
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  )
}
