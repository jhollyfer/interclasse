import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { BrandMark } from '#/components/common/brand-mark'
import { LocaleSwitch } from '#/components/common/locale-switch'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { AUTHENTICATION, NAVIGATION } from './menu'
import type { MenuItem } from './menu'

/**
 * The pill for each destination: in the top strip (`bar`) or in the phone panel
 * (`panel`). A style variant of the link itself, via `cva`, and not a
 * boolean structure prop.
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
 * The active item is the brand amber, and the inactive one is the faded light ink over
 * the night green. It is not `text-foreground`: this strip does not invert with the theme -
 * it is dark in both -, so the ink is the strip's token.
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

/** The menu panel: open it takes up height, closed it leaves the focus flow. */
const MENU_PANEL: Record<string, string> = {
  true: 'py-6',
  false: 'invisible',
}

/** A navigation destination, in the top strip or in the phone panel. */
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
      // `exact` for the home: without it `/` would match every storefront screen, and
      // "Início" would stay lit across the whole site.
      activeOptions={{ exact: item.to === '/' }}
      // `inactiveProps` and not `className`: the Router adds `className` to
      // `activeProps`, and the two colors together left white text over the
      // yellow on the active item.
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
  const [open, setOpen] = React.useState(false)

  let menuLabel = m.public_menu_open()
  if (open) menuLabel = m.public_menu_close()

  function close(): void {
    setOpen(false)
  }

  return (
    <header
      data-slot="public-header"
      className="fixed top-0 left-0 z-sticky w-full border-b border-brand-ink-foreground/5 bg-brand-ink/95 backdrop-blur-md"
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
              'ml-2 bg-brand font-semibold text-brand-ink active:scale-press',
            )}
          >
            {AUTHENTICATION.label()}
          </Link>
          <LocaleSwitch className="ml-1 text-brand-ink-foreground hover:bg-brand-ink-foreground/10" />
        </nav>

        {/*
          The hamburger that becomes an X. The three bars are `<span>`s with `transform`:
          the top one rotates and drops, the middle one shrinks until it vanishes, the bottom one rotates and
          rises. `origin-center` so the two diagonals cross in the middle.
        */}
        <button
          type="button"
          data-slot="public-header-toggle"
          data-open={open || undefined}
          aria-expanded={open}
          aria-label={menuLabel}
          onClick={() => setOpen((previous) => !previous)}
          className="group flex size-8 flex-col items-center justify-center gap-menu-bar text-brand-ink-foreground md:hidden"
        >
          <span className="block h-px w-5 origin-center bg-current transition-transform duration-250 group-data-open:translate-y-menu-bar-shift group-data-open:rotate-45 motion-reduce:transition-none" />
          <span className="block h-px w-5 origin-center bg-current transition-transform duration-200 group-data-open:scale-x-0 motion-reduce:transition-none" />
          <span className="block h-px w-5 origin-center bg-current transition-transform duration-250 group-data-open:-translate-y-menu-bar-shift group-data-open:-rotate-45 motion-reduce:transition-none" />
        </button>
      </div>

      {/*
        The mobile panel. `grid-rows-collapsed` to `grid-rows-expanded` animates the height without anyone
        having to measure it - it is the CSS trick that replaces the
        `height: auto` that a transition does not know how to animate. `invisible` when closed
        because zero height with `overflow-hidden` still leaves the link focusable.
      */}
      <div
        data-slot="public-header-mobile"
        data-open={open || undefined}
        className="grid grid-rows-collapsed overflow-hidden border-brand-ink-foreground/10 opacity-0 transition-reveal duration-300 data-open:grid-rows-expanded data-open:border-t data-open:opacity-100 motion-reduce:transition-none md:hidden"
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
              'mt-3 rounded-full bg-brand text-center font-semibold text-brand-ink active:scale-press',
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
