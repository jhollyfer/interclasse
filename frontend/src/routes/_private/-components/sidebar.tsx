import type * as React from 'react'
import { Link, getRouteApi, useMatchRoute } from '@tanstack/react-router'
import { SignOutIcon } from '@phosphor-icons/react'

import { BrandMark } from '#/components/common/brand-mark'
import {
  Sidebar as Root,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '#/components/ui/sidebar'

import { menuFor } from './menu'
import {
  SignOutConfirm,
  SignOutConfirmFooter,
  SignOutConfirmHeader,
} from './sign-out-confirm'
import type { MenuItem } from './menu'

const privateRoute = getRouteApi('/_private')

/**
 * O destino do item que deve aparecer marcado, ou `undefined`.
 *
 * A regra é "o mais específico ganha", e aqui ela não é preparação para o
 * futuro: `/administrator` é prefixo de toda tela do painel, então com
 * casamento difuso sozinho o item Início ficaria aceso na listagem de
 * depoimentos, na de notícias e em todas as outras ao mesmo tempo.
 *
 * Difuso é o que se quer para o resto: em `/administrator/testimonials/123/edit`
 * quem deve estar marcado é Depoimentos.
 */
function useActiveTo(items: ReadonlyArray<MenuItem>): string | undefined {
  const matchRoute = useMatchRoute()

  let active: string | undefined

  for (const item of items) {
    // `label` e `icon` saem porque não são opções de rota.
    const { label: _label, icon: _icon, ...link } = item

    if (!matchRoute({ ...link, fuzzy: true })) continue
    if (active && active.length >= item.to.length) continue

    active = item.to
  }

  return active
}

/**
 * Um item de menu: o botão renderiza COMO o link, e não em volta dele.
 *
 * A ordem importa. Com o `<Link>` aninhado dentro do `SidebarMenuButton`, quem
 * recebia o clique era o botão, e o `<a>` ficava por dentro - sem preload no
 * hover, sem abrir em nova aba, sem clique do meio. Com `render`, o elemento
 * final é um `<a>` de verdade com as classes do botão.
 *
 * `label` e `icon` saem do spread de propósito: eles não são props do `<Link>`,
 * e chegariam ao `<a>` do DOM como atributo desconhecido - um deles sendo uma
 * função de componente.
 *
 * No mobile a barra lateral é um Sheet, e navegar sem fechá-lo deixava o drawer
 * por cima da tela nova. Aqui não dá para usar `SheetClose`: quem monta o Sheet
 * é `components/ui/sidebar.tsx`, que o mantém controlado por `openMobile` e
 * esconde o close embutido. `setOpenMobile(false)` é a API que ele expõe para
 * isso, e no desktop `openMobile` não pinta nada.
 */
function NavigationItem({
  item,
  isActive,
}: Readonly<{
  item: MenuItem
  isActive: boolean
}>): React.JSX.Element {
  const { icon: Icon, label, ...link } = item
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        // Com a barra recolhida sobra só o ícone; o tooltip é o que devolve o
        // nome do destino, e o componente já o esconde quando ela está aberta.
        tooltip={label}
        render={<Link {...link} />}
        onClick={() => setOpenMobile(false)}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/**
 * A navegação do painel.
 *
 * **A identidade fica no cabeçalho; a saída fica nos dois lugares.** A
 * referência põe nome, avatar e "Sair" juntos no pé da barra lateral, e a
 * migração levou o conjunto para o cabeçalho. Só que sair virou uma ação
 * escondida atrás do avatar: o `frontend-old` tinha o botão no pé da barra
 * **e** o item no menu do perfil, e quem usava o painel procurava o botão.
 * Aqui o pé volta com a saída sozinha - o nome e o avatar continuam no
 * cabeçalho, sem duas fontes para a mesma identidade.
 */
export function Sidebar(): React.JSX.Element {
  const { setOpenMobile } = useSidebar()
  const { account } = privateRoute.useRouteContext()
  const menu = menuFor(account.role)
  // A união de todos os grupos: o item mais específico ganha, e ele pode estar
  // num grupo diferente do que casou primeiro.
  const active = useActiveTo(menu.flatMap((group) => group.items))

  return (
    <Root collapsible="icon" variant="sidebar">
      <SidebarHeader className="h-14 justify-center border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to="/painel" />}
              onClick={() => setOpenMobile(false)}
              className="hover:bg-transparent"
            >
              <BrandMark />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {menu.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavigationItem
                  key={item.label}
                  item={item}
                  isActive={active === item.to}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/*
              `tooltip` porque com a barra recolhida sobra só o ícone, e um
              ícone de saída sem rótulo é o botão que ninguém arrisca clicar.

              O botão não desloga: ele abre a confirmação, e quem desloga é o
              `SignOutConfirm`. Sem `disabled` de pendência porque não há mais
              janela para o duplo clique - o alerta fecha ao confirmar, e a
              navegação para fora do `_private` desmonta o drawer no mobile.
            */}
            <SignOutConfirm
              trigger={
                <SidebarMenuButton tooltip="Sair">
                  <SignOutIcon />
                  <span>Sair</span>
                </SidebarMenuButton>
              }
            >
              <SignOutConfirmHeader />
              <SignOutConfirmFooter />
            </SignOutConfirm>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Root>
  )
}
