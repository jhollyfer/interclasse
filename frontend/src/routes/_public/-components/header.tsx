import { ListIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import * as React from 'react'

import { BrandMark } from '#/components/common/brand-mark'
import { LocaleSwitch } from '#/components/common/locale-switch'
import { ThemeToggle } from '#/components/common/theme-toggle'
import { Button, buttonVariants } from '#/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { storefrontSiteQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { AUTHENTICATION, visibleNavigation } from './menu'
import type { MenuItem } from './menu'

/**
 * The pill for each destination in the top strip. The phone menu is the kit's `Sheet` and
 * styles its own links; what is left here is what only the dark strip needs.
 */
const NAVIGATION_PILL =
  'font-medium transition-colors duration-200 motion-reduce:transition-none rounded-full px-4 py-1.5 text-sm'

/**
 * The active item is the brand amber, and the inactive one is the faded light ink over
 * the night green. It is not `text-foreground`: this strip does not invert with the theme -
 * it is dark in both -, so the ink is the strip's token.
 */
const ACTIVE_PILL = 'bg-brand text-brand-ink font-semibold'

const INACTIVE_PILL =
  'text-brand-ink-foreground/70 hover:bg-brand-ink-foreground/10 hover:text-brand-ink-foreground'

/** A navigation destination in the top strip. */
function NavigationLink({
  item,
}: Readonly<{ item: MenuItem }>): React.JSX.Element {
  return (
    <Link
      data-slot="public-header-link"
      to={item.to}
      // `exact` for the home: without it `/` would match every storefront screen, and
      // "Início" would stay lit across the whole site.
      activeOptions={{ exact: item.to === '/' }}
      // `inactiveProps` and not `className`: the Router adds `className` to
      // `activeProps`, and the two colors together left white text over the
      // yellow on the active item.
      className={NAVIGATION_PILL}
      activeProps={{ className: ACTIVE_PILL }}
      inactiveProps={{ className: INACTIVE_PILL }}
    >
      {item.label()}
    </Link>
  )
}

/**
 * The storefront header: a fixed dark strip at the top, with the brand on the left, the
 * pill navigation in the center and the dashboard door on the right.
 *
 * Fixed and not static, as in the previous frontend: the public pages are
 * long - the home has six sections - and the navigation leaves the view at the
 * first scroll. `backdrop-blur` because the strip is translucent and the content
 * passes underneath it.
 *
 * The pill strip appears from `xl`, and not from `lg`. There are eight
 * destinations plus the dashboard door, and at `lg`'s 1024px they do not fit beside
 * the brand without squeezing the pill until the line breaks. Below that the
 * hamburger panel answers, which lists the same eight in a column, with
 * room to spare. Hiding a piece of the strip until `xl` is what the reference
 * does with the territory selector at the top (`hidden xl:flex`).
 *
 * The mobile menu is `useState` and CSS, and not an animation library: the
 * previous frontend carried `framer-motion` just for the hamburger's three bars
 * and for the panel's height, and both are a transition of
 * `transform` and of `grid-template-rows`. The global `prefers-reduced-motion` in
 * `styles.css` reaches both.
 */
export function Header(): React.JSX.Element {
  const { data: site } = useQuery(storefrontSiteQueryOptions())
  const navigation = visibleNavigation(site)

  return (
    <header
      data-slot="public-header"
      className="fixed top-0 left-0 z-sticky w-full border-b border-brand-ink-foreground/5 bg-brand-ink/95 backdrop-blur-md"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          to="/"
          className="flex min-h-11 shrink-0 items-center text-brand-ink-foreground"
        >
          <BrandMark />
        </Link>

        <nav
          data-slot="public-header-navigation"
          className="hidden items-center gap-1 rounded-full border border-brand-ink-foreground/10 bg-brand-ink-foreground/5 px-2 py-1.5 md:flex"
        >
          {navigation.map((item) => (
            <NavigationLink key={item.to} item={item} />
          ))}

          <Link
            to={AUTHENTICATION.to}
            className={cn(
              NAVIGATION_PILL,
              'ml-2 bg-brand font-semibold text-brand-ink active:scale-press',
            )}
          >
            {AUTHENTICATION.label()}
          </Link>
          <LocaleSwitch className="ml-1 text-brand-ink-foreground hover:bg-brand-ink-foreground/10" />
          <ThemeToggle className="text-brand-ink-foreground hover:bg-brand-ink-foreground/10 hover:text-brand-ink-foreground" />
        </nav>

        {/*
          The phone menu is the kit's `Sheet` (sheet-pattern): the focus trap, Esc and the
          return of focus come from the primitive. The navigation links close it through
          `SheetClose`, and not by an `onClick` that closes by hand.
        */}
        <Sheet>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-slot="public-header-toggle"
                aria-label={m.public_menu_open()}
                className="-mr-2 text-brand-ink-foreground hover:bg-brand-ink-foreground/10 hover:text-brand-ink-foreground md:hidden"
              >
                <ListIcon aria-hidden />
              </Button>
            }
          />
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>{m.public_menu_title()}</SheetTitle>
              <SheetDescription className="sr-only">
                {m.public_menu_description()}
              </SheetDescription>
            </SheetHeader>
            <nav
              data-slot="public-header-mobile"
              className="flex flex-col gap-1 px-4"
            >
              {navigation.map((item) => (
                <SheetClose
                  key={item.to}
                  render={
                    <Link
                      to={item.to}
                      activeOptions={{ exact: item.to === '/' }}
                      className={buttonVariants({
                        variant: 'ghost',
                        className: 'justify-start',
                      })}
                      activeProps={{ className: 'bg-muted font-semibold' }}
                    />
                  }
                >
                  {item.label()}
                </SheetClose>
              ))}
              <SheetClose
                render={
                  <Link
                    to={AUTHENTICATION.to}
                    className={buttonVariants({
                      className: 'mt-3 justify-center',
                    })}
                  />
                }
              >
                {AUTHENTICATION.label()}
              </SheetClose>
            </nav>
            <SheetFooter className="flex-row items-center justify-start gap-1">
              <LocaleSwitch visibleLabel />
              <ThemeToggle />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
