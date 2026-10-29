import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { InstagramLogoIcon } from '@phosphor-icons/react'

import { storefrontSiteQueryOptions } from '#/integrations/tanstack-query/queries'
import type { IStorefrontSite } from '#/lib/interfaces'
import { plural } from '#/lib/labels'

import { RegulationLink } from '../../-components/regulation-link'
import { Empty, Section, SectionHeader, SectionTitle  } from '../../-components/section'

/** "Desde 2025 · há 1 ano": o tempo dos jogos, quando a organização informou. */
function sinceLabel(firstEditionYear: number): string {
  const years = new Date().getFullYear() - firstEditionYear
  if (years < 1) return `Desde ${firstEditionYear}`

  return `Desde ${firstEditionYear} · há ${plural(years, 'ano', 'anos')}`
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
        <SectionTitle render={<h1 />}>Sobre os jogos</SectionTitle>
      </SectionHeader>
      <div className="grid items-start gap-8 md:grid-cols-[auto_1fr]">
        <img
          src="/logo-512.png"
          alt="2º JIC - II Jogos Interclasse do Cosme, CMEI 2026"
          width={192}
          height={192}
          className="size-40 md:size-48"
        />
        <AboutContent site={site} />
      </div>
    </Section>
  )
}

function AboutContent({
  site,
}: Readonly<{ site?: IStorefrontSite }>): React.JSX.Element {
  if (!site || (!site.about && !site.organizer && !site.edition))
    return (
      <Empty>A organização ainda não escreveu a apresentação dos jogos.</Empty>
    )

  const paragraphs = (site.about ?? '')
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim() !== '')

  return (
    <div className="flex max-w-prose flex-col gap-4">
      <p className="text-primary flex flex-wrap gap-x-3 font-semibold">
        {site.edition && <span>{site.edition}ª edição</span>}
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
          <span className="text-muted-foreground">Criação e organização: </span>
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
