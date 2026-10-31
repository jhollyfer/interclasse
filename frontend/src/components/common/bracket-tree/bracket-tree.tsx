import type { AdministratorBracketShowResponse } from '@interclasse/shared'
import { MATCH_STATUS } from '@interclasse/shared'
import { CheckIcon, TrophyIcon } from '@phosphor-icons/react'
import type * as React from 'react'

import { cn } from '#/lib/cn'
import { MATCH_PHASE_LABELS, championName, formatWhen } from '#/lib/labels'
import { m } from '#/paraglide/messages'

/** A match in the bracket, as `GET /brackets/:id` returns it. */
export type BracketMatch = AdministratorBracketShowResponse['matches'][number]

type BracketTreeProps = Readonly<{
  bracket: AdministratorBracketShowResponse
  /** What goes under each match: on the dashboard, score, schedule and cards. */
  renderActions?: (match: BracketMatch) => React.ReactNode
}>

/** A slot in a round: the match, or the bye of whoever advanced without playing. */
type Slot =
  | { kind: 'match'; match: BracketMatch }
  | { kind: 'bye'; key: string; teamName: string | null }

/**
 * The next round holds whoever advanced on a bye: slot `position` of the first
 * round falls into match `position / 2` of the next, as home when even -
 * the same calculation as the backend's `advanceSlot`.
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
 * Each game's number, as on the teacher's match sheet: in round and
 * position order, counting only the matches that exist (a bye is not a game).
 */
function numbering(matches: ReadonlyArray<BracketMatch>): Map<string, number> {
  const ordered = [...matches].sort(
    (a, b) => a.round - b.round || a.position - b.position,
  )

  return new Map(ordered.map((match, index) => [match.id, index + 1]))
}

/**
 * What to show in a still-empty slot: which game the occupant comes from. The home
 * slot comes from the game at position `2p` of the previous round; the away slot
 * from `2p + 1` - the inverse of the backend's `advanceSlot`.
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

/** The bracket's columns, one per round, with the number of slots in each. */
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
 * The knockout bracket drawn as a bracket: one column per round, each match
 * between the two that feed it. The winner gets the ✓ and moves on; the loser
 * is struck through - out.
 *
 * Lives in `common` because the site and the dashboard draw the same bracket; the
 * dashboard only adds the actions under each match.
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
  /** The empty slot's text: "Vencedor do Jogo N". */
  homePending: string
  awayPending: string
}>

/** A match: the number, the two sides, the score and who advanced. */
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
