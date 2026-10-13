import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { advisorClassroomsQueryOptions } from '#/integrations/tanstack-query/queries'
import { CATEGORY_LABELS } from '#/lib/labels'

import { ADVISOR_CLASSROOMS } from '../index'

export function ClassroomsPage(): React.JSX.Element {
  const { data } = useSuspenseQuery(
    advisorClassroomsQueryOptions(ADVISOR_CLASSROOMS),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>Minhas turmas</PageHeaderTitle>
        <PageHeaderDescription>
          Os alunos de cada turma e em quais modalidades vão jogar.
        </PageHeaderDescription>
      </PageHeader>

      {data.data.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          Nenhuma turma vinculada a você. Peça à organização para indicá-lo como
          conselheiro.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.data.map((classroom) => (
          <Link
            key={classroom.id}
            to="/advisor/$classroomId"
            params={{ classroomId: classroom.id }}
          >
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="text-2xl">{classroom.name}</CardTitle>
                <CardDescription>
                  {CATEGORY_LABELS[classroom.category]}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
