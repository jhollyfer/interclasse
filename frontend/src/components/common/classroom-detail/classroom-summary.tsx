import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdvisorEnrollmentShowResponse } from '@interclasse/shared'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { advisorClassroomsQueryOptions } from '#/integrations/tanstack-query/queries/advisor'
import { CATEGORY_LABELS, CATEGORY_SHORT_LABELS, plural } from '#/lib/labels'
import { cn } from '#/lib/utils'

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
        <CardTitle>Sobre a turma</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Categoria</dt>
          <dd>
            {CATEGORY_LABELS[board.classroom.category]}{' '}
            <span className="text-muted-foreground">
              ({CATEGORY_SHORT_LABELS[board.classroom.category]})
            </span>
          </dd>
          <dt className="text-muted-foreground">Conselheiro</dt>
          <dd className="truncate">
            {classroom?.advisor?.name ?? 'Sem conselheiro'}
          </dd>
          <dt className="text-muted-foreground">Representante</dt>
          <dd className="truncate">
            {classroom?.representative?.name ?? 'Sem representante'}
          </dd>
          <dt className="text-muted-foreground">Alunos</dt>
          <dd>{board.students.length}</dd>
          <dt className="text-muted-foreground">Atletas</dt>
          <dd>{athletes}</dd>
          <dt className="text-muted-foreground">Modalidades</dt>
          <dd>
            {plural(sports.length, 'modalidade', 'modalidades')}
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
