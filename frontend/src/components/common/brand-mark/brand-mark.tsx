import type * as React from 'react'

import logo128 from '#/assets/logo-128.png'
import { Picture } from '#/components/common/picture'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/**
 * The games' brand: the 2nd JIC logo and the name in sporty italics.
 *
 * The logo is decorative (empty `alt`): the name beside it already says what it
 * says, and repeating it would make the screen reader read the brand twice.
 *
 * It is not a link: whoever uses it decides where it leads.
 */
export function BrandMark({
  className,
  ...rest
}: React.ComponentProps<'span'>): React.JSX.Element {
  return (
    <span
      data-slot="brand-mark"
      {...rest}
      className={cn('flex items-center gap-2 leading-none', className)}
    >
      {/* In the collapsed sidebar only the logo is left: the name disappears from the screen,
          not from the screen reader. Outside the sidebar the selector matches nothing. */}
      <Picture
        src={logo128}
        alt=""
        width={40}
        height={40}
        className="size-10 shrink-0 group-data-[collapsible=icon]:size-7"
        placement="lcp"
      />
      <span className="font-display text-xl font-extrabold uppercase italic group-data-[collapsible=icon]:sr-only">
        {m.common_brand_name()}
      </span>
    </span>
  )
}
