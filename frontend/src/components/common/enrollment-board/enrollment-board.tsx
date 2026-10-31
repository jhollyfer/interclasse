import type { AdvisorEnrollmentShowResponse } from '@interclasse/shared'
import { LockSimpleIcon } from '@phosphor-icons/react'
import * as React from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { m } from '#/paraglide/messages'

type EnrollmentBoardProps = Readonly<{
  board: AdvisorEnrollmentShowResponse
  /**
   * Saves the sport's whole list. `removed` are the names of those who were
   * saved and left: the advisor must justify the removal.
   */
  onSave: (
    sportId: string,
    studentIds: Array<string>,
    removed: ReadonlyArray<string>,
  ) => void
  /** The sport being saved right now. Only its card locks. */
  savingSportId?: string
  /**
   * Whether an already saved athlete can be removed. The representative only adds; the one who
   * removes is the advisor teacher - and the server refuses with `403`.
   */
  canRemove?: boolean
}>

/**
 * The athlete list per sport: one card per sport, one checkbox per
 * student. Saving sends the whole list for that sport - it is the contract of
 * `PUT /advisor/enrollments` and `PUT /representative/enrollments`.
 *
 * Lives in `common` because the advisor and the representative use the same screen.
 * State is local per sport: ticking boxes does not call the API until saved.
 */
export function EnrollmentBoard({
  board,
  onSave,
  savingSportId,
  canRemove = true,
}: EnrollmentBoardProps): React.JSX.Element {
  if (board.students.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        {m.common_enrollment_no_students()}
      </p>
    )
  }

  if (board.sports.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        {m.common_enrollment_no_sports()}
      </p>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {board.sports.map((sport) => (
        <SportCard
          key={sport.id}
          sport={sport}
          students={board.students}
          onSave={onSave}
          isSaving={savingSportId === sport.id}
          canRemove={canRemove}
        />
      ))}
    </div>
  )
}

/** A count outside the limits calls for attention. */
const COUNT_VARIANT: Record<string, 'warning' | 'neutral'> = {
  true: 'warning',
  false: 'neutral',
}

function SportCard({
  sport,
  students,
  onSave,
  isSaving,
  canRemove,
}: Readonly<{
  sport: AdvisorEnrollmentShowResponse['sports'][number]
  students: AdvisorEnrollmentShowResponse['students']
  onSave: EnrollmentBoardProps['onSave']
  isSaving?: boolean
  canRemove: boolean
}>): React.JSX.Element {
  const enrolled = students
    .filter((student) => student.sportIds.includes(sport.id))
    .map((student) => student.id)
  // Stable key of the saved list: the card only returns to the server state
  // when THIS sport's list changed, and not on every refetch - which would
  // erase what was ticked and not yet saved in the other cards.
  const savedKey = [...enrolled].sort().join(',')
  const initial = new Set(savedKey.split(',').filter(Boolean))
  const [selected, setSelected] = React.useState(initial)
  // Reset during render, and not a `useEffect` mirroring the prop (`frontend.md` §2): the
  // saved list changed, the draft goes back to it before drawing.
  const [seenKey, setSeenKey] = React.useState(savedKey)
  if (seenKey !== savedKey) {
    setSeenKey(savedKey)
    setSelected(initial)
  }

  const over = selected.size > sport.maxAthletes
  const under = selected.size > 0 && selected.size < sport.minAthletes
  const dirty =
    selected.size !== initial.size ||
    [...selected].some((id) => !initial.has(id))

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(id)
    if (!checked) next.delete(id)
    setSelected(next)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1">{sport.name}</CardTitle>
        {sport.locked && (
          <Badge variant="neutral">
            <LockSimpleIcon />
            {m.common_enrollment_drawn()}
          </Badge>
        )}
        {/* Drawn and still editable: only the advisor gets here, and the drawn
            team is the classroom, not the list. */}
        {sport.drawn && !sport.locked && (
          <Badge variant="info">{m.common_enrollment_drawn()}</Badge>
        )}
        <Badge variant={COUNT_VARIANT[String(over || under)]}>
          {m.common_enrollment_count({
            count: selected.size,
            min: sport.minAthletes,
            max: sport.maxAthletes,
          })}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="grid gap-2 sm:grid-cols-2">
          {students.map((student) => (
            <li key={student.id}>
              {/* Locked, whoever was not enrolled looks faded: with the same color as
                  everything else, the drawn list looked editable. */}
              <label className="flex items-center gap-2 text-sm has-data-disabled:cursor-not-allowed has-data-disabled:not-has-data-checked:text-muted-foreground">
                <Checkbox
                  checked={selected.has(student.id)}
                  disabled={
                    sport.locked || (!canRemove && initial.has(student.id))
                  }
                  onCheckedChange={(checked) =>
                    toggle(student.id, checked === true)
                  }
                />
                {student.name}
              </label>
            </li>
          ))}
        </ul>
        {over && !sport.locked && (
          <p className="text-destructive text-xs">
            {m.common_enrollment_over({
              count: selected.size - sport.maxAthletes,
            })}
          </p>
        )}
        {under && !sport.locked && (
          <p className="text-muted-foreground text-xs">
            {m.common_enrollment_under()}
          </p>
        )}
        {!sport.locked && (
          <Button
            className="self-end"
            size="sm"
            disabled={!dirty || over || isSaving}
            onClick={() =>
              onSave(
                sport.id,
                [...selected],
                students
                  .filter(
                    (student) =>
                      initial.has(student.id) && !selected.has(student.id),
                  )
                  .map((student) => student.name),
              )
            }
          >
            {m.common_enrollment_save({ name: sport.name })}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
