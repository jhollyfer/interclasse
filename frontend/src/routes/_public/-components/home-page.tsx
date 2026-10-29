import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import {
  storefrontAnnouncementsQueryOptions,
  storefrontBracketsQueryOptions,
  storefrontMatchesQueryOptions,
} from '#/integrations/tanstack-query/queries'
import { Agenda } from '#/components/common/match-agenda'

import {
  HOME_ANNOUNCEMENTS,
  HOME_BRACKETS,
  HOME_NEXT,
  HOME_RESULTS,
} from '../index'
import { AnnouncementList } from './announcement-list'
import { NextMatch } from './next-match'
import { RegulationLink } from './regulation-link'
import { ResultsTicker } from './results-ticker'
import { StandingsExplorer } from './standings-explorer'
import {
  Empty,
  Section,
  SectionHeader,
  SectionMore,
  SectionTitle,
} from './section'

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
        <div className="container mx-auto grid items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div className="flex flex-col gap-5">
            <img
              src="/logo-512.png"
              alt="2º JIC - II Jogos Interclasse do Cosme, CMEI 2026"
              width={144}
              height={144}
              className="size-28 md:size-36"
            />
            <p className="text-brand font-semibold">
              CMEI Cosme Jean, 2ª edição
            </p>
            <h1 className="font-display pb-1 text-5xl leading-[1.05] font-extrabold uppercase italic md:text-6xl">
              Jogos Estudantis 2026
            </h1>
            <p className="max-w-md text-lg text-brand-ink-foreground/80">
              Tabela, placar e classificação das turmas do 3º ao 9º ano,
              atualizados durante os jogos.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/jogos" className="skew-button bg-brand text-brand-ink">
                Ver jogos
              </Link>
              <Link
                to="/classificacao"
                className="skew-button border border-brand-ink-foreground/30 text-brand-ink-foreground"
              >
                Classificação
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
          <SectionTitle>Próximos jogos</SectionTitle>
          <SectionMore to="/jogos">Tabela completa</SectionMore>
        </SectionHeader>
        {upcoming.length === 0 && (
          <Empty>Nenhum jogo marcado. A agenda sai depois do sorteio.</Empty>
        )}
        <Agenda matches={upcoming} />
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Classificação</SectionTitle>
        </SectionHeader>
        <StandingsExplorer
          brackets={brackets.data?.data ?? []}
          selected={bracketId}
          onSelect={setBracketId}
        />
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Avisos</SectionTitle>
          <SectionMore to="/avisos">Todos os avisos</SectionMore>
        </SectionHeader>
        <AnnouncementList announcements={announcements.data?.data ?? []} />
      </Section>
    </>
  )
}
