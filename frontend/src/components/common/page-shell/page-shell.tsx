import type { Merge } from '@interclasse/shared'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import * as React from 'react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/**
 * The shell of a dashboard screen: fixed header, scrolling content, fixed footer.
 *
 * It solves a single thing, and the one that gives the most trouble in CSS: the
 * pagination stopping from scrolling away with the list. Without it the whole screen scrolls, and the
 * pagination of a 50-row list ends up below the fold - to change
 * page one has to scroll to the end, and on reaching the next page scroll back
 * to the top.
 *
 * The `min-h-0` chain is what makes this work: a `flex` child does not shrink
 * below its own content by default, so without it the middle `overflow-auto`
 * never gets a bounded height and the scroll leaks outside.
 *
 * Compound and not a `header`/`footer` prop: the slots accept anything, and
 * the order in the JSX is the order on screen.
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
      // `min-h-0 flex-1` and not `h-full`: inside a flex parent with a height it
      // fills what is left; outside one, it simply flows. `h-full`
      // would resolve to `auto` in the second case and `overflow-hidden`
      // would clip the content.
      // On mobile, the card list scrolled in a half-screen box inside the
      // page. There the page becomes the one that scrolls: the shell grows with the
      // content. Only with a list (`has-`), because in forms `Salvar` lives
      // in the header and has to stay in view.
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

// The divider line is always drawn: whoever does not want it passes `border-b-0`
// in `className`, and `cn` resolves the conflict - structure does not become a prop.
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
 * The scrolling area of every dashboard screen.
 *
 * **`data-scroll-restoration-id` is what names this scroll.** The router
 * saves the position of any element that scrolls, but without an id it identifies
 * the element by a positional selector built by climbing the tree with `nth-child`
 * indexes. It is enough for the page to render with one extra child on a visit - the
 * "nenhum depoimento aguardando análise" notice on the dashboard home is
 * conditional - for the saved selector to stop matching the element, and the return
 * to land at the top of the list instead of where the person was.
 *
 * A constant and not derived from the route: there is only one of these per screen, and the router
 * stores the position by location key, not by id.
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
 * A screen's title, with an optional back on the left and actions on the right.
 *
 * Separate from `PageShellHeader` because not every header is a title: that of a
 * step-by-step form screen has something else there.
 *
 * Slots and not text props because the screens do not agree on what goes
 * here: some do not go back anywhere, others have three buttons on the right, and
 * a news record shows two badges that a testimonial does not have. With a
 * prop, each such variation becomes one more optional prop in here.
 *
 * The grid has three fixed columns - `grid-cols-page-header` - and each part declares
 * where it goes. That way the order in the JSX does not decide the layout, and the column of an
 * absent part collapses to zero width on its own, without `has-data-[...]`.
 */
export function PageHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="page-header"
      className={cn(
        // Without the "voltar", column 1 is empty and the `gap-x` still separated it from the
        // title: a 12px indent that no other block on the screen had.
        'grid w-full grid-cols-page-header items-center gap-x-0 gap-y-0.5 has-[[data-slot$=-back]]:gap-x-3',
        className,
      )}
      {...props}
    />
  )
}

type PageHeaderBackProps = Readonly<{
  /**
   * Where the back button points.
   *
   * A route, and not a callback: going back is navigation, and as a `Link` it responds
   * to open in a new tab, to middle click and to the context menu. An `onClick`
   * with `navigate()` does none of that. That is why it stays a prop and not a slot - it is
   * a destination, not markup.
   */
  to: LinkProps['to']
  params?: LinkProps['params']
  /** The part of another compound that is this arrow (`form-shell-back`). */
  'data-slot'?: `${string}-back`
}>

/** The back arrow. A screen that came from nowhere simply does not write it. */
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
 * The badges to the right of the title, on the same line.
 *
 * A part of its own, and not loose text inside the title: the `<span>` isolates what is
 * state from what is name. For someone reading the screen with a screen reader, "Semana da
 * Consciência Negra Publicada Arquivada" would become the record's name.
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

/** Disappears when the screen has nothing to explain. */
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
 * The actions on the right: create, edit, archive, export - one, three or
 * none. `flex-wrap` because three buttons do not fit side by side on a phone.
 *
 * A `div` with `gap`, and not `ButtonGroup`: the group **glues** its direct children -
 * it removes the right rounding and the left border - and that is how a
 * segmented control is drawn. These actions are not a single control; they are
 * independent buttons that sometimes wrap to a new line.
 */
export function PageHeaderActions({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element | null {
  if (!children) return null

  return (
    <div
      data-slot="page-header-actions"
      className={cn(
        // On mobile the actions drop to the line below: on the same line as the
        // title they squeezed it into three lines.
        'col-span-full row-start-3 flex flex-wrap items-center gap-2 justify-start max-sm:mt-2 sm:col-span-1 sm:ml-3 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:justify-end sm:self-center',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
