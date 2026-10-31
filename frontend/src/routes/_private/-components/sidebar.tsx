import { USER_ROLE } from '@interclasse/shared'
import { SignOutIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi, useMatchRoute } from '@tanstack/react-router'
import type * as React from 'react'

import { BrandMark } from '#/components/common/brand-mark'
import {
  Sidebar as Root,
  SidebarContent,
  SidebarFooter,
  SidebarMenuBadge,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '#/components/ui/sidebar'
import { enrollmentRemovalsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

import { PENDING_REMOVALS, menuFor } from './menu'
import type { MenuItem } from './menu'
import {
  SignOutConfirm,
  SignOutConfirmFooter,
  SignOutConfirmHeader,
} from './sign-out-confirm'

const privateRoute = getRouteApi('/_private')

/**
 * The destination of the item that must appear marked, or `undefined`.
 *
 * The rule is "the most specific wins", and here it is not preparation for the
 * future: `/administrator` is a prefix of every dashboard screen, so with fuzzy
 * matching alone the Início item would light up on the testimonials listing,
 * the news one and every other at the same time.
 *
 * Fuzzy is what is wanted for the rest: on `/administrator/testimonials/123/edit`
 * whoever should be marked is Depoimentos.
 */
function useActiveTo(items: ReadonlyArray<MenuItem>): string | undefined {
  const matchRoute = useMatchRoute()

  let active: string | undefined

  for (const item of items) {
    // `label` and `icon` leave because they are not route options.
    const { label: _label, icon: _icon, ...link } = item

    if (!matchRoute({ ...link, fuzzy: true })) continue
    if (active && active.length >= item.to.length) continue

    active = item.to
  }

  return active
}

/**
 * A menu item: the button renders AS the link, and not around it.
 *
 * The order matters. With the `<Link>` nested inside `SidebarMenuButton`, whoever
 * received the click was the button, and the `<a>` stayed inside - with no preload on
 * hover, no opening in a new tab, no middle click. With `render`, the final
 * element is a real `<a>` with the button's classes.
 *
 * `label` and `icon` leave the spread on purpose: they are not `<Link>` props,
 * and would reach the DOM's `<a>` as an unknown attribute - one of them being
 * a component function.
 *
 * On mobile the sidebar is a Sheet, and navigating without closing it left the drawer
 * on top of the new screen. `SheetClose` cannot be used here: whoever builds the Sheet
 * is `components/ui/sidebar.tsx`, which keeps it controlled by `openMobile` and
 * hides the built-in close. `setOpenMobile(false)` is the API it exposes for
 * that, and on desktop `openMobile` paints nothing.
 */
function NavigationItem({
  item,
  isActive,
  badge,
}: Readonly<{
  item: MenuItem
  isActive: boolean
  /** A number beside the label: what awaits the reader's attention. */
  badge?: number
}>): React.JSX.Element {
  const { icon: Icon, label, ...link } = item
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        // With the sidebar collapsed only the icon is left; the tooltip is what gives back the
        // destination's name, and the component already hides it when the bar is open.
        tooltip={label}
        render={<Link {...link} />}
        onClick={() => setOpenMobile(false)}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
      {Boolean(badge) && (
        <SidebarMenuBadge className="bg-primary text-primary-foreground">
          {badge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}

/**
 * The dashboard navigation.
 *
 * **Identity stays in the header; sign-out stays in both places.** The
 * reference puts name, avatar and "Sair" together at the sidebar's foot, and the
 * migration moved the set to the header. But signing out became an action
 * hidden behind the avatar: `frontend-old` had the button at the foot of the bar
 * **and** the item in the profile menu, and whoever used the dashboard looked for the button.
 * Here the foot comes back with sign-out alone - the name and avatar stay in
 * the header, without two sources for the same identity.
 */
export function Sidebar(): React.JSX.Element {
  const { setOpenMobile } = useSidebar()
  const { account } = privateRoute.useRouteContext()
  const menu = menuFor(account.role)
  // The union of all the groups: the most specific item wins, and it may be
  // in a different group from the one that matched first.
  const active = useActiveTo(menu.flatMap((group) => group.items))
  // The notice of a removed athlete reaches the administrator through the menu, wherever
  // they are on the dashboard.
  const { data: removals } = useQuery({
    ...enrollmentRemovalsQueryOptions(PENDING_REMOVALS),
    enabled: account.role === USER_ROLE.ADMINISTRATOR,
  })
  const badges: Partial<Record<string, number>> = {
    '/administrator/removals': removals?.meta.total,
  }

  return (
    <Root collapsible="icon" variant="sidebar">
      <SidebarHeader className="h-14 justify-center border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to="/dashboard" />}
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
                  badge={badges[item.to]}
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
              `tooltip` because with the sidebar collapsed only the icon is left, and an
              exit icon without a label is the button nobody risks clicking.

              The button does not sign out: it opens the confirmation, and whoever signs out is
              `SignOutConfirm`. No pending `disabled` because there is no longer
              a window for the double click - the alert closes on confirm, and the
              navigation out of `_private` unmounts the drawer on mobile.
            */}
            <SignOutConfirm
              render={
                <SidebarMenuButton tooltip={m.panel_sign_out()}>
                  <SignOutIcon />
                  <span>{m.panel_sign_out()}</span>
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
