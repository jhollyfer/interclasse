import type * as React from 'react'

import maiyuLogo from '#/assets/maiyu.png'
import { Picture } from '#/components/common/picture'
import { cn } from '#/lib/cn'
import { partsText } from '#/lib/i18n'
import { m } from '#/paraglide/messages'

/**
 * The credit to whoever built the system: the Maiyu brand and name, with a link.
 *
 * Lives in `common` because every layout shows it - the site, the dashboard and the sign-in.

 * The sentence comes from one message with `{#link}` markup (`m.common_maiyu_credit.parts()`,
 * `_doc-lib/paraglide.md#/markup`): the link text is translated with the phrase, never glued.
 * The color comes from whoever uses it (`className`): the site's footer is dark, the dashboard's
 * follows the theme.
 *
 */
export function MaiyuCredit({
  className,
  ...rest
}: React.ComponentProps<'p'>): React.JSX.Element {
  const parts = m.common_maiyu_credit.parts()
  const start = parts.findIndex((part) => part.type === 'markup-start')
  const end = parts.findIndex((part) => part.type === 'markup-end')
  const before = parts.slice(0, start)
  const link = parts.slice(start + 1, end)
  const after = parts.slice(end + 1)

  return (
    <p
      data-slot="maiyu-credit"
      {...rest}
      className={cn(
        'flex items-center justify-center gap-2 text-center',
        className,
      )}
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
        {partsText(before)}
        <a
          href="https://maiyu.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline-offset-4 hover:underline"
        >
          {partsText(link)}
        </a>
        {partsText(after)}
      </span>
    </p>
  )
}
