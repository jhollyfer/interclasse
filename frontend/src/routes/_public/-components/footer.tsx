import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { InstagramLogoIcon } from '@phosphor-icons/react'

import { BrandMark } from '#/components/common/brand-mark'
import { MaiyuCredit } from '#/components/common/maiyu-credit'
import { storefrontSiteQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { NAVIGATION } from './menu'
import { RegulationLink } from './regulation-link'

/** O link de um perfil do Instagram, com o `@` à mostra. */
function InstagramLink({
  handle,
  ariaLabel,
}: Readonly<{ handle: string; ariaLabel: string }>): React.JSX.Element {
  return (
    <a
      href={`https://instagram.com/${handle}`}
      target="_blank"
      rel="noreferrer"
      aria-label={ariaLabel}
      className="flex items-center gap-2 py-1 text-sm text-brand-ink-foreground/70 hover:text-brand-ink-foreground"
    >
      <InstagramLogoIcon className="size-5" />@{handle}
    </a>
  )
}

/**
 * Os Instagrams vêm da configuração do site, que a organização edita: o da
 * escola e o de quem desenvolveu. Vazio, o link some.
 */
export function Footer(): React.JSX.Element {
  const { data: site } = useQuery(storefrontSiteQueryOptions())

  return (
    <footer
      data-slot="public-footer"
      className="bg-brand-ink border-accent mt-12 border-t-4 text-brand-ink-foreground"
    >
      <div className="container mx-auto flex flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <BrandMark />
          <p className="max-w-sm text-sm text-brand-ink-foreground/70">
            {m.public_footer_tagline()}
          </p>
        </div>

        <nav
          className="flex flex-col gap-2 text-sm"
          aria-label={m.public_footer_nav_label()}
        >
          {NAVIGATION.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="py-1 text-brand-ink-foreground/70 hover:text-brand-ink-foreground"
            >
              {item.label()}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-1">
          <RegulationLink className="py-1 text-sm text-brand-ink-foreground/70 hover:text-brand-ink-foreground" />
          {site?.schoolInstagram && (
            <InstagramLink
              handle={site.schoolInstagram}
              ariaLabel={m.public_footer_instagram_school({
                handle: site.schoolInstagram,
              })}
            />
          )}
          {site?.developerInstagram && (
            <InstagramLink
              handle={site.developerInstagram}
              ariaLabel={m.public_footer_instagram_developer({
                handle: site.developerInstagram,
              })}
            />
          )}
        </div>
      </div>

      <div className="border-t border-brand-ink-foreground/10">
        <MaiyuCredit className="container mx-auto justify-start px-4 py-4 text-sm text-brand-ink-foreground/70 [&_a]:text-brand-ink-foreground" />
      </div>
    </footer>
  )
}
