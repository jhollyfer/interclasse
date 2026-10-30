import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrophyIcon } from '@phosphor-icons/react'
import type {
  AdministratorBracketPaginateResponse,
  Category,
} from '@interclasse/shared'
import { CATEGORIES } from '@interclasse/shared'

import { BracketTree } from '#/components/common/bracket-tree'
import { Skeleton } from '#/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { storefrontBracketQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import {
  BRACKET_STATUS_LABELS,
  CATEGORY_LABELS,
  CATEGORY_SHORT_LABELS,
  championName,
} from '#/lib/labels'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

import { Empty } from './section'

type StandingsExplorerProps = Readonly<{
  brackets: ReadonlyArray<AdministratorBracketPaginateResponse>
  /** A chave aberta. Ausente, abre a primeira da primeira categoria sorteada. */
  selected?: string
  onSelect: (id: string) => void
}>

/**
 * A classificação navegável: abas por categoria (Fundamental 1 e 2), uma
 * modalidade por botão, e a chave escolhida desenhada logo abaixo - tudo no
 * lugar, sem sair da página.
 *
 * Controlado por fora (`selected`/`onSelect`): a home guarda a escolha em
 * estado, e `/classificacao/$id` na URL, para o link poder ser compartilhado.
 */
export function StandingsExplorer({
  brackets,
  selected,
  onSelect,
}: StandingsExplorerProps): React.JSX.Element {
  const categories = CATEGORIES.filter((category) =>
    brackets.some((bracket) => bracket.category === category),
  )
  const current =
    brackets.find((bracket) => bracket.id === selected) ?? brackets.at(0)

  if (!current || categories.length === 0)
    return <Empty>{m.public_standings_empty()}</Empty>

  const inCategory = brackets.filter(
    (bracket) => bracket.category === current.category,
  )

  function selectCategory(category: Category): void {
    const first = brackets.find((bracket) => bracket.category === category)
    if (first) onSelect(first.id)
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={current.category}
        onValueChange={(value: Category) => selectCategory(value)}
      >
        <TabsList aria-label={m.public_standings_category_label()}>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="px-4">
              {CATEGORY_LABELS[category]}
              <span className="text-muted-foreground hidden text-xs sm:inline">
                {CATEGORY_SHORT_LABELS[category]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div
        role="group"
        aria-label={m.public_standings_sport_label()}
        className="flex flex-wrap gap-2"
      >
        {inCategory.map((bracket) => (
          <button
            key={bracket.id}
            type="button"
            aria-pressed={bracket.id === current.id}
            onClick={() => onSelect(bracket.id)}
            className={cn(
              'hover:border-primary hover:text-primary flex flex-col items-start rounded-md border px-4 py-2 text-left transition-colors active:scale-[0.98] motion-reduce:transition-none',
              'aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground',
            )}
          >
            <span className="font-semibold">{bracket.sport.name}</span>
            <span className="text-xs opacity-80">
              {BRACKET_STATUS_LABELS[bracket.status]}
            </span>
          </button>
        ))}
      </div>

      <StandingsBracket id={current.id} />
    </div>
  )
}

/** A chave aberta. Troca de chave mostra o esqueleto, não a chave anterior. */
function StandingsBracket({ id }: Readonly<{ id: string }>): React.JSX.Element {
  const {
    data: bracket,
    isPending,
    isError,
  } = useQuery(storefrontBracketQueryOptions(id))

  if (isError) return <Empty>{m.public_standings_error()}</Empty>

  if (isPending) return <Skeleton className="h-64 w-full" />

  const champion = championName(bracket)

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <h3 className="font-display text-3xl font-extrabold uppercase italic">
        {m.public_standings_bracket_title({
          sport: bracket.sport.name,
          category: CATEGORY_LABELS[bracket.category] ?? bracket.category,
        })}
      </h3>
      {champion && (
        <p className="bg-accent text-accent-foreground flex items-center gap-3 rounded-lg p-4 text-lg font-extrabold uppercase italic">
          <TrophyIcon className="size-7" weight="fill" />
          {m.public_standings_champion({ name: champion })}
        </p>
      )}
      <p className="text-muted-foreground text-sm">
        {m.public_standings_howto()}
      </p>
      <BracketTree bracket={bracket} />
    </div>
  )
}
