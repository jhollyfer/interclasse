import type * as React from 'react'

import maiyuLogo from '#/assets/maiyu.png'
import { Picture } from '#/components/common/picture'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/**
 * The credit to whoever built the system: the Maiyu brand and name, with a link.
 *
 * Lives in `common` because every layout shows it - the site, the dashboard and the sign-in.
 * The color comes from whoever uses it (`className`): the site's footer is dark, the dashboard's
 * follows the theme.
 */
export function MaiyuCredit({
  className,
  ...rest
}: React.ComponentProps<'p'>): React.JSX.Element {
  return (
    <p
      data-slot="maiyu-credit"
      {...rest}
      className={cn('flex items-center justify-center gap-2', className)}
    >
      <Picture
        src={maiyuLogo}
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0"
        placement="fold"
      />
      <span>
        {m.common_maiyu_credit_by()}{' '}
        <a
          href="https://maiyu.com.br"
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline-offset-4 hover:underline"
        >
          Maiyu
        </a>
        . {m.common_maiyu_credit_tagline()}.
      </span>
    </p>
  )
}
