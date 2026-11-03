import type { AdvisorEnrollmentShowResponse } from '@interclasse/shared'
import { CaretDownIcon, LockSimpleIcon } from '@phosphor-icons/react'
import * as React from 'react'

import { EmptyNote } from '#/components/common/empty-note'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { Label } from '#/components/ui/label'
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
 * The athlete list per sport: one collapsible block per sport, one checkbox per
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
    return <EmptyNote>{m.common_enrollment_no_students()}</EmptyNote>
  }

  if (board.sports.length === 0) {
    return <EmptyNote>{m.common_enrollment_no_sports()}</EmptyNote>
  }

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      {board.sports.map((sport, index) => (
        <SportBlock
          key={sport.id}
          defaultOpen={index === 0}
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

/** The save button leaves the faded look when there is nothing to save: `outline` keeps its border. */
const SAVE_VARIANT: Record<string, 'default' | 'outline'> = {
  true: 'default',
  false: 'outline',
}

/**
 * One sport, as a `Collapsible` of the kit: with 20 students and 4 sports the page was 80 checkboxes
 * long, so only the first sport opens and the others fold into one line each. The element keeps
 * the keyboard, the state and the screen-reader role of a disclosure without a line of script
 * (`<details>`/`<summary>`, WHATWG HTML), and, unlike a conditional render, keeps what was
 * ticked and not yet saved when the block closes.
 */
function SportBlock({
  defaultOpen,
  sport,
  students,
  onSave,
  isSaving,
  canRemove,
}: Readonly<{
  defaultOpen: boolean
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

  const saveVariant = SAVE_VARIANT[String(dirty && !over)]

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="bg-card ring-foreground/10 overflow-hidden rounded-lg ring-1"
    >
      <CollapsibleTrigger className="group/trigger flex min-h-11 w-full cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-left select-none focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset">
        <span className="flex-1 text-sm font-medium">{sport.name}</span>
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
        <CaretDownIcon className="text-muted-foreground transition-transform group-data-panel-open/trigger:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      {/* `keepMounted`: closing the block keeps what was ticked and not yet saved. */}
      <CollapsibleContent keepMounted>
        <ul className="grid border-t sm:grid-cols-2">
          {students.map((student) => (
            <li key={student.id}>
              {/* Locked, whoever was not enrolled looks faded: with the same color as
                everything else, the drawn list looked editable. The whole row is the
                target (44px), not only the 16px square. */}
              <Label className="hover:bg-muted/50 flex min-h-11 items-center gap-3 px-4 text-sm has-data-disabled:cursor-not-allowed has-data-disabled:not-has-data-checked:text-muted-foreground">
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
              </Label>
            </li>
          ))}
        </ul>
        {!sport.locked && (
          // Sticky at the foot of the scroll: with 20 students the button used to end
          // up a screen away from the ticks.
          <div className="bg-card sticky bottom-0 z-sticky flex flex-col gap-2 border-t p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-0.5">
              {over && (
                <p role="alert" className="text-destructive text-xs">
                  {m.common_enrollment_over({
                    count: selected.size - sport.maxAthletes,
                  })}
                </p>
              )}
              {under && (
                <p className="text-muted-foreground text-xs">
                  {m.common_enrollment_under()}
                </p>
              )}
            </div>
            {/* The kit fades a disabled button to 50%; on the dark card that left
              the outline Save barely legible. 70% still reads as off. */}
            <Button
              className="disabled:opacity-70 sm:shrink-0"
              variant={saveVariant}
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
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
