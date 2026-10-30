import { CheckIcon, TrophyIcon } from '@phosphor-icons/react'
import type * as React from 'react'
import type { AdministratorBracketShowResponse } from '@interclasse/shared'
import { MATCH_STATUS } from '@interclasse/shared'

import { MATCH_PHASE_LABELS, championName, formatWhen } from '#/lib/labels'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/** Uma partida da chave, como `GET /brackets/:id` a devolve. */
export type BracketMatch = AdministratorBracketShowResponse['matches'][number]

type BracketTreeProps = Readonly<{
  bracket: AdministratorBracketShowResponse
  /** O que vai embaixo de cada partida: no painel, placar, agenda e cartões. */
  renderActions?: (match: BracketMatch) => React.ReactNode
}>

/** Uma vaga de uma fase: a partida, ou a folga de quem subiu sem jogar. */
type Slot =
  | { kind: 'match'; match: BracketMatch }
  | { kind: 'bye'; key: string; teamName: string | null }

/**
 * A fase seguinte guarda quem subiu de folga: a vaga `position` da primeira
 * fase cai na partida `position / 2` da seguinte, como mandante quando é par -
 * a mesma conta do `advanceSlot` do backend.
 */
function byeTeam(
  matches: ReadonlyArray<BracketMatch>,
  round: number,
  position: number,
): string | null {
  const next = matches.find(
    (match) =>
      match.round === round + 1 && match.position === Math.floor(position / 2),
  )
  if (!next) return null
  if (position % 2 === 0) return next.homeName

  return next.awayName
}

/**
 * O número de cada jogo, como na súmula do professor: em ordem de fase e de
 * posição, contando só as partidas que existem (folga não é jogo).
 */
function numbering(matches: ReadonlyArray<BracketMatch>): Map<string, number> {
  const ordered = [...matches].sort(
    (a, b) => a.round - b.round || a.position - b.position,
  )

  return new Map(ordered.map((match, index) => [match.id, index + 1]))
}

/**
 * O que mostrar na vaga ainda vazia: de qual jogo sai quem ocupa ela. A vaga
 * de mandante vem do jogo na posição `2p` da fase anterior; a de visitante,
 * do `2p + 1` - o inverso do `advanceSlot` do backend.
 */
function feederLabel(
  matches: ReadonlyArray<BracketMatch>,
  numbers: Map<string, number>,
  match: BracketMatch,
  side: 'home' | 'away',
): string {
  let offset = 0
  if (side === 'away') offset = 1

  const feeder = matches.find(
    (item) =>
      item.round === match.round - 1 &&
      item.position === match.position * 2 + offset,
  )
  const number = feeder && numbers.get(feeder.id)
  if (!number) return m.common_bracket_pending()

  return m.common_bracket_winner_of({ number })
}

/** As colunas da chave, uma por fase, com o número de vagas de cada uma. */
function columns(matches: ReadonlyArray<BracketMatch>) {
  const rounds = Math.max(1, ...matches.map((match) => match.round))

  return Array.from({ length: rounds }, (_, index) => {
    const round = index + 1
    const slots = 2 ** (rounds - round)
    const inRound = matches.filter((match) => match.round === round)
    const phase = inRound[0]?.phase

    const items: Slot[] = Array.from({ length: slots }, (_slot, position) => {
      const match = inRound.find((item) => item.position === position)
      if (match) return { kind: 'match', match }

      return {
        kind: 'bye',
        key: `bye-${round}-${position}`,
        teamName: byeTeam(matches, round, position),
      }
    })

    return { round, phase, items }
  })
}

/**
 * A chave de mata-mata desenhada como chave: uma coluna por fase, cada partida
 * entre as duas que a alimentam. Quem venceu leva o ✓ e segue; quem perdeu
 * fica riscado - está fora.
 *
 * Mora em `common` porque o site e o painel desenham a mesma chave; o painel
 * só acrescenta as ações embaixo de cada partida.
 */
export function BracketTree({
  bracket,
  renderActions,
}: BracketTreeProps): React.JSX.Element {
  const champion = championName(bracket)
  const tree = columns(bracket.matches)
  const numbers = numbering(bracket.matches)

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <ol className="flex min-w-max gap-6">
        {tree.map((column) => (
          <li key={column.round} className="flex w-56 flex-col">
            <h3 className="font-display mb-3 text-lg font-extrabold uppercase italic">
              {MATCH_PHASE_LABELS[column.phase ?? ''] ??
                m.common_bracket_round({ round: column.round })}
            </h3>
            <ul className="flex flex-1 flex-col justify-around gap-4">
              {column.items.map((slot) => {
                if (slot.kind === 'bye')
                  return (
                    <li
                      key={slot.key}
                      className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs"
                    >
                      {m.common_bracket_bye({
                        team: slot.teamName ?? m.common_bracket_pending(),
                      })}
                    </li>
                  )

                return (
                  <li key={slot.match.id}>
                    <MatchBox
                      match={slot.match}
                      number={numbers.get(slot.match.id)}
                      homePending={feederLabel(
                        bracket.matches,
                        numbers,
                        slot.match,
                        'home',
                      )}
                      awayPending={feederLabel(
                        bracket.matches,
                        numbers,
                        slot.match,
                        'away',
                      )}
                    />
                    {renderActions?.(slot.match)}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
        <li className="flex w-44 flex-col">
          <h3 className="font-display mb-3 text-lg font-extrabold uppercase italic">
            {m.common_bracket_champion()}
          </h3>
          <div className="flex flex-1 flex-col justify-around">
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border p-3 font-semibold',
                champion && 'bg-accent text-accent-foreground border-accent',
                !champion && 'text-muted-foreground border-dashed',
              )}
            >
              <TrophyIcon className="size-5 shrink-0" weight="fill" />
              {champion ?? m.common_bracket_pending()}
            </div>
          </div>
        </li>
      </ol>
    </div>
  )
}

type MatchBoxProps = Readonly<{
  match: BracketMatch
  number: number | undefined
  /** O texto da vaga vazia: "Vencedor do Jogo N". */
  homePending: string
  awayPending: string
}>

/** Uma partida: o número, os dois lados, o placar e quem seguiu. */
function MatchBox({
  match,
  number,
  homePending,
  awayPending,
}: MatchBoxProps): React.JSX.Element {
  const finished = match.status === MATCH_STATUS.FINISHED

  let when = formatWhen(match.scheduledAt)
  if (match.location)
    when = m.common_match_when_location({ when, location: match.location })

  return (
    <div className="bg-card overflow-hidden rounded-lg border text-sm shadow-xs">
      {number && (
        <p className="text-muted-foreground border-b px-3 py-1 text-xs font-medium">
          {m.common_bracket_game_number({ number })}
        </p>
      )}
      <TeamRow
        name={match.homeName}
        pending={homePending}
        score={match.homeScore}
        finished={finished}
        won={finished && match.winnerTeamId === match.homeTeamId}
      />
      <TeamRow
        name={match.awayName}
        pending={awayPending}
        score={match.awayScore}
        finished={finished}
        won={finished && match.winnerTeamId === match.awayTeamId}
      />
      {!finished && (
        <p className="text-muted-foreground border-t px-3 py-1 text-xs">
          {when}
        </p>
      )}
    </div>
  )
}

type TeamRowProps = Readonly<{
  name: string | null
  pending: string
  score: number | null
  finished: boolean
  won: boolean
}>

function TeamRow({
  name,
  pending,
  score,
  finished,
  won,
}: TeamRowProps): React.JSX.Element {
  const lost = finished && !won

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 not-last:border-b',
        won && 'bg-primary/10 font-semibold',
      )}
    >
      <span
        className={cn(
          'flex-1 truncate',
          !name && 'text-muted-foreground',
          lost && 'text-muted-foreground line-through decoration-1',
        )}
      >
        {name ?? pending}
      </span>
      {won && (
        <span className="text-primary flex items-center gap-0.5 text-xs">
          <CheckIcon weight="bold" />
          {m.common_bracket_advanced()}
        </span>
      )}
      {lost && (
        <span className="text-muted-foreground text-xs">
          {m.common_bracket_out()}
        </span>
      )}
      <span className="w-5 text-right tabular-nums">{score ?? ''}</span>
    </div>
  )
}
