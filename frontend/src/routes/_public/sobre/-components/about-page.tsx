import type { StorefrontSiteShowResponse } from '@interclasse/shared'
import { InstagramLogoIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'

import logo512 from '#/assets/logo-512.png'
import { Picture } from '#/components/common/picture'
import { storefrontSiteQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { RegulationLink } from '../../-components/regulation-link'
import {
  Empty,
  Section,
  SectionHeader,
  SectionTitle,
} from '../../-components/section'

/** "Desde 2025 · há 1 ano": o tempo dos jogos, quando a organização informou. */
function sinceLabel(firstEditionYear: number): string {
  const years = new Date().getFullYear() - firstEditionYear
  if (years < 1) return m.public_about_since({ year: firstEditionYear })

  return m.public_about_since_years({ year: firstEditionYear, years })
}

/**
 * O "Sobre os jogos": o que são, quem organiza, a edição, desde quando, e o
 * regulamento. Tudo vem do que a organização preencheu no painel; o que
 * ficou vazio não aparece.
 */
export function AboutPage(): React.JSX.Element {
  const { data: site } = useQuery(storefrontSiteQueryOptions())

  return (
    <Section>
      <SectionHeader>
        <SectionTitle render={<h1 />}>{m.public_about_title()}</SectionTitle>
      </SectionHeader>
      <div className="grid items-start gap-8 md:grid-cols-[auto_1fr]">
        <Picture
          src={logo512}
          alt={m.public_logo_alt()}
          width={192}
          height={192}
          className="size-40 md:size-48"
          placement="lcp"
        />
        <AboutContent site={site} />
      </div>
    </Section>
  )
}

function AboutContent({
  site,
}: Readonly<{ site?: StorefrontSiteShowResponse }>): React.JSX.Element {
  if (!site || (!site.about && !site.organizer && !site.edition))
    return <Empty>{m.public_about_empty()}</Empty>

  const paragraphs = (site.about ?? '')
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim() !== '')

  return (
    <div className="flex max-w-prose flex-col gap-4">
      <p className="text-primary flex flex-wrap gap-x-3 font-semibold">
        {site.edition && (
          <span>{m.public_about_edition({ edition: site.edition })}</span>
        )}
        {site.firstEditionYear && (
          <span>{sinceLabel(site.firstEditionYear)}</span>
        )}
      </p>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-lg whitespace-pre-line">
          {paragraph}
        </p>
      ))}
      {site.organizer && (
        <p>
          <span className="text-muted-foreground">
            {m.public_about_organizer()}{' '}
          </span>
          {site.organizer}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <RegulationLink className="skew-button bg-brand text-brand-ink" />
        {site.schoolInstagram && (
          <a
            href={`https://instagram.com/${site.schoolInstagram}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex items-center gap-2 font-medium hover:underline"
          >
            <InstagramLogoIcon className="size-5" />@{site.schoolInstagram}
          </a>
        )}
      </div>
    </div>
  )
}
