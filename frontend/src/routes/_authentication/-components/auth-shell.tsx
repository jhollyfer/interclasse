import type { Merge } from '@interclasse/shared'
import { Link } from '@tanstack/react-router'
import type * as React from 'react'

import { BrandMark } from '#/components/common/brand-mark'
import { LocaleSwitch } from '#/components/common/locale-switch'
import { MaiyuCredit } from '#/components/common/maiyu-credit'
import { ThemeToggle } from '#/components/common/theme-toggle'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/**
 * The authentication screens' frame: brand side panel on the left and the
 * form on the right. Below `lg` the side panel disappears entirely and only the logo
 * is left at the top.
 *
 * **Only the frame.** What appears in the side panel and the width of the content column
 * are parts, and each screen writes the ones it has.
 *
 * **No context:** there is no state to share between the parts - each one
 * is self-sufficient, and the skill says not to invent a provider without it. For the same reason they
 * fit in a single file: the folder rule exists so that the context and the hook-guard
 * live apart, and here there is neither.
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
 * The brand column. It disappears below `lg`, and disappears without children.
 *
 * The dark is the association's `--brand-ink`, and not the skeleton's `bg-muted`:
 * this panel is the only place in the product where the brand appears at its full
 * size, and the light theme's cream washed the amber seal out against the background. It does not
 * invert with the theme - the institutional color is dark in both -, so the column
 * declares its own light ink and the brand inherits it.

 * Nothing decorative besides the brand: no corners, no sales phrase.
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
        'hidden overflow-hidden bg-brand-ink text-primary-foreground lg:col-span-5 lg:flex lg:flex-col lg:justify-center lg:p-8',
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

/** The brand. Appears in the side panel and, below `lg`, at the top of the content. */
function AuthShellBrand({
  className,
  ...props
}: React.ComponentProps<'span'>): React.JSX.Element {
  return (
    // Link to the site: whoever landed on the sign-in by mistake goes back without typing a URL.
    <Link to="/" aria-label={m.auth_back_to_site()}>
      <BrandMark
        data-slot="auth-shell-brand"
        className={className}
        {...props}
      />
    </Link>
  )
}

/**
 * The screen's title and the line that explains it.
 *
 * It used to be a `<header>` with `h1` and `p` written by hand on every screen. A screen without `h1` is
 * a screen without a name for whoever navigates by headings.
 */
function AuthShellHeader({
  className,
  title,
  children,
  ...props
}: Merge<
  Omit<React.ComponentProps<'header'>, 'title'>,
  { title: React.ReactNode }
>): React.JSX.Element {
  return (
    <header
      data-slot="auth-shell-header"
      className={cn('flex flex-col gap-1', className)}
      {...props}
    >
      <h1 className="font-display text-3xl leading-tight font-extrabold italic">
        {title}
      </h1>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
    </header>
  )
}

/**
 * The centered core of the side panel: the brand at its size.
 *
 * Centered on both axes, as in the previous frontend
 * (`frontend-old/components/composition/auth-shell/index.tsx`, `AuthShell.Brand`):
 * the side panel is a single piece - the brand - in the middle of a dark rectangle.
 */
function AuthShellAsideBody({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="auth-shell-aside-body"
      className={cn(
        'relative z-1 flex flex-1 flex-col items-center justify-center gap-6 py-10',
        className,
      )}
      {...props}
    />
  )
}

/**
 * The form column.
 *
 * `className` targets the content's width, and not `<main>`: it is what each screen
 * adjusts. The header with the logo below `lg` stays inside here - it is
 * the frame's responsiveness, not the screen's choice -, and over the institutional
 * dark, which is where the amber seal reads best.
 */
function AuthShellContent({
  className,
  children,
  ...props
}: React.ComponentProps<'main'>): React.JSX.Element {
  return (
    <main
      data-slot="auth-shell-content"
      // Below `lg` the form starts right under the logo band, with normal breathing
      // room: centering it left ~230px of empty space above it on a phone.
      className="flex min-h-dvh flex-col lg:col-span-7"
      {...props}
    >
      <header className="flex justify-center bg-brand-ink p-4 text-primary-foreground lg:hidden">
        <AuthShellBrand className="h-10 w-auto" />
      </header>

      <div
        className={cn(
          'flex w-full max-w-md flex-col gap-8 px-4 py-8 sm:mx-auto sm:px-6 lg:my-auto lg:py-10',
          className,
        )}
      >
        {children}
      </div>
      <footer className="text-muted-foreground mt-auto flex items-center justify-between gap-4 px-4 py-4 text-xs sm:px-6 [&_a]:text-foreground">
        <MaiyuCredit />
        {/* The theme and the language are chosen before signing in too: the dashboard header is not reached yet. */}
        <div className="flex items-center gap-1 text-foreground">
          <LocaleSwitch visibleLabel />
          <ThemeToggle />
        </div>
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
}
