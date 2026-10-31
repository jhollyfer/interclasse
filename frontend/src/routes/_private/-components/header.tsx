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
 * The current screen's trail.
 *
 * `useMatches()` and not `location.pathname`: the list of routes that matched is what
 * says which prefixes really exist. The whole rule lives in
 * `lib/breadcrumbs.ts`, tested there.
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
 * The account menu: who is logged in, the path to the account itself and the sign-out.
 *
 * The name and avatar come from the **route context**, which the `beforeLoad` of
 * `_private/layout.tsx` filled with `queryClient.query()`. No new request goes out
 * here, and the header never renders a moment without a name.
 */
function AccountMenu(): React.JSX.Element {
  const { account } = route.useRouteContext()
  const [signOutHandle] = React.useState(createConfirmHandle)

  return (
    <React.Fragment>
      <DropdownMenu>
        {/*
        `render`, and not nesting: the trigger is already a `<button>`, and another button
        inside it would be a button inside a button - a hydration error.
      */}
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted">
          <Avatar className="size-7">
            <AvatarImage src={account.avatar?.url} alt="" />
            <AvatarFallback
              aria-hidden="true"
              className="bg-brand text-xs font-semibold text-brand-ink"
            >
              {initials(account.name)}
            </AvatarFallback>
          </Avatar>
          {/* Accessible name from the content, with the visible name inside: WCAG 2.5.3. */}
          <span className="sr-only">{m.panel_account_label()}</span>
          <span className="sr-only text-xs leading-none font-semibold lg:not-sr-only">
            {account.name}
          </span>
          <CaretDownIcon className="size-3 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" align="end">
          {/* `DropdownMenuLabel` is Base UI's `Menu.GroupLabel` and requires the surrounding
            `Menu.Group`: without it, opening the menu throws "MenuGroupContext
            is missing" and the layout's ErrorBoundary shows the error page. */}
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
      {/* A sibling of the menu, and not inside the content: the content unmounts on close
        and would take the alert with it (`frontend.md` §6.2). */}
      <SignOutConfirm handle={signOutHandle}>
        <SignOutConfirmHeader />
        <SignOutConfirmFooter />
      </SignOutConfirm>
    </React.Fragment>
  )
}

/**
 * The dashboard header: the sidebar trigger, the trail, the theme and the account.
 *
 * A component of its own, and not loose markup in the layout as in the reference: here it
 * carries the account menu, which is state and mutation - and the layout is the place of the
 * guard, not of the screen.
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
