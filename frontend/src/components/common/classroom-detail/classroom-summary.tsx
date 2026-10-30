import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdvisorEnrollmentShowResponse } from '@interclasse/shared'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { advisorClassroomsQueryOptions } from '#/integrations/tanstack-query/queries/advisor'
import { CATEGORY_LABELS, CATEGORY_SHORT_LABELS } from '#/lib/labels'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { VISIBLE_CLASSROOMS } from './classroom-detail-loader'

/**
 * O quadro do canto: quem aconselha, quem representa e os totais da turma.
 *
 * Os totais saem do quadro de inscrições, que a tela já leu; as pessoas, da
 * lista de turmas visíveis, que já vem com elas precarregadas.
 */
export function ClassroomSummary({
  board,
  className,
}: Readonly<{
  board: AdvisorEnrollmentShowResponse
  className?: string
}>): React.JSX.Element {
  const { data } = useQuery(advisorClassroomsQueryOptions(VISIBLE_CLASSROOMS))
  const classroom = data?.data.find((item) => item.id === board.classroom.id)

  const athletes = board.students.filter(
    (student) => student.sportIds.length > 0,
  ).length
  const sports = board.sports.filter((sport) =>
    board.students.some((student) => student.sportIds.includes(sport.id)),
  )

  return (
    <Card className={cn('gap-3', className)}>
      <CardHeader>
        <CardTitle>{m.common_summary_title()}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            {m.common_summary_category()}
          </dt>
          <dd>
            {CATEGORY_LABELS[board.classroom.category]}{' '}
            <span className="text-muted-foreground">
              ({CATEGORY_SHORT_LABELS[board.classroom.category]})
            </span>
          </dd>
          <dt className="text-muted-foreground">
            {m.common_summary_advisor()}
          </dt>
          <dd className="truncate">
            {classroom?.advisor?.name ?? m.common_summary_no_advisor()}
          </dd>
          <dt className="text-muted-foreground">
            {m.common_summary_representative()}
          </dt>
          <dd className="truncate">
            {classroom?.representative?.name ??
              m.common_summary_no_representative()}
          </dd>
          <dt className="text-muted-foreground">
            {m.common_summary_students()}
          </dt>
          <dd>{board.students.length}</dd>
          <dt className="text-muted-foreground">
            {m.common_summary_athletes()}
          </dt>
          <dd>{athletes}</dd>
          <dt className="text-muted-foreground">{m.common_summary_sports()}</dt>
          <dd>
            {m.common_summary_sports_count({ count: sports.length })}
            {sports.length > 0 && (
              <span className="text-muted-foreground block">
                {sports.map((sport) => sport.name).join(', ')}
              </span>
            )}
          </dd>
        </dl>
      </CardContent>
    </Card>
  )
}
