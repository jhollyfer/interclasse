import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import * as React from 'react'

import { Agenda } from '#/components/common/match-agenda'
import {
  storefrontAnnouncementsQueryOptions,
  storefrontBracketsQueryOptions,
  storefrontMatchesQueryOptions,
} from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import {
  HOME_ANNOUNCEMENTS,
  HOME_BRACKETS,
  HOME_NEXT,
  HOME_RESULTS,
} from '../index'
import { AnnouncementList } from './announcement-list'
import { NextMatch } from './next-match'
import { PhotoCarousel } from './photo-carousel'
import { RegulationLink } from './regulation-link'
import { ResultsTicker } from './results-ticker'
import {
  Empty,
  Section,
  SectionHeader,
  SectionMore,
  SectionTitle,
} from './section'
import { StandingsExplorer } from './standings-explorer'

export function HomePage(): React.JSX.Element {
  const next = useQuery(storefrontMatchesQueryOptions(HOME_NEXT))
  const results = useQuery(storefrontMatchesQueryOptions(HOME_RESULTS))
  const announcements = useQuery(
    storefrontAnnouncementsQueryOptions(HOME_ANNOUNCEMENTS),
  )
  const brackets = useQuery(storefrontBracketsQueryOptions(HOME_BRACKETS))
  const [bracketId, setBracketId] = React.useState<string>()

  const upcoming = next.data?.data ?? []
  const finished = results.data?.data ?? []

  return (
    <>
      <section className="hero text-brand-ink-foreground">
        <div className="container mx-auto grid items-start gap-6 px-4 py-8 md:grid-cols-hero md:gap-10 md:py-12">
          <div className="flex flex-col gap-4">
            <p className="text-brand font-semibold">
              {m.public_home_edition()}
            </p>
            <h1 className="font-display leading-display text-5xl font-extrabold uppercase italic md:text-6xl">
              {m.public_home_title()}
            </h1>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/matches"
                className="skew-button bg-brand text-brand-ink"
              >
                {m.public_home_see_games()}
              </Link>
              <Link
                to="/standings"
                className="skew-button border border-brand-ink-foreground/30 text-brand-ink-foreground"
              >
                {m.public_nav_standings()}
              </Link>
              <RegulationLink className="skew-button border border-brand-ink-foreground/30 text-brand-ink-foreground" />
            </div>
          </div>

          <NextMatch next={upcoming[0]} last={finished[0]} />
        </div>
      </section>

      <ResultsTicker matches={finished} />

      <Section>
        <SectionHeader>
          <SectionTitle>{m.public_home_upcoming_title()}</SectionTitle>
          <SectionMore to="/matches">
            {m.public_home_full_schedule()}
          </SectionMore>
        </SectionHeader>
        {upcoming.length === 0 && (
          <Empty>{m.public_home_upcoming_empty()}</Empty>
        )}
        <Agenda matches={upcoming} />
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>{m.public_nav_standings()}</SectionTitle>
        </SectionHeader>
        <StandingsExplorer
          brackets={brackets.data?.data ?? []}
          selected={bracketId}
          onSelect={setBracketId}
        />
      </Section>

      <PhotoCarousel />

      <Section>
        <SectionHeader>
          <SectionTitle>{m.public_nav_announcements()}</SectionTitle>
          <SectionMore to="/announcements">
            {m.public_home_all_announcements()}
          </SectionMore>
        </SectionHeader>
        <AnnouncementList announcements={announcements.data?.data ?? []} />
      </Section>
    </>
  )
}
