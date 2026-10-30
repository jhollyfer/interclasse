import type { AdministratorClassroomPaginateResponse } from '@interclasse/shared'
import { CATEGORIES } from '@interclasse/shared'
import { PlusIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import type * as React from 'react'

import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { classroomsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { CATEGORY_LABELS, CATEGORY_SHORT_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { CLASSROOM_GRID } from '../index'
import { ClassroomRowActions } from './row-actions'

const route = getRouteApi('/_private/administrator/classrooms/')

/** "Todas" é a aba sem `?category`. */
const ALL = 'ALL'

/**
 * As turmas em cartões, por categoria. Cartão e não tabela: são duas dúzias,
 * e o que se procura é a turma - "o 3º A" -, não uma coluna para ordenar.
 * Cada cartão abre a turma inteira; o menu do canto edita e remove.
 */
export function ClassroomGrid(): React.JSX.Element {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isPending, isError, refetch } = useQuery(
    classroomsQueryOptions({ ...CLASSROOM_GRID, category: search.category }),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>{m.admin_classrooms_title()}</PageHeaderTitle>
        <PageHeaderDescription>
          {m.admin_classrooms_description()}
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button
            render={
              <Link to="/administrator/classrooms/new">
                <PlusIcon />
                {m.admin_classrooms_create()}
              </Link>
            }
          />
        </PageHeaderActions>
      </PageHeader>

      <Tabs
        value={search.category ?? ALL}
        onValueChange={(value: string) =>
          void navigate({
            search: { category: CATEGORIES.find((item) => item === value) },
            replace: true,
          })
        }
      >
        <TabsList aria-label={m.admin_common_category()}>
          <TabsTrigger value={ALL} className="px-4">
            {m.admin_common_all()}
          </TabsTrigger>
          {CATEGORIES.map((category) => (
            <TabsTrigger key={category} value={category} className="px-4">
              {CATEGORY_LABELS[category]}
              <span className="text-muted-foreground hidden text-xs sm:inline">
                {CATEGORY_SHORT_LABELS[category]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isPending && <Skeleton className="h-48 w-full" />}

      {isError && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          {m.admin_classrooms_load_error()}{' '}
          <Button variant="link" onClick={() => void refetch()}>
            {m.admin_common_retry()}
          </Button>
        </p>
      )}

      {data?.data.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          {m.admin_classrooms_empty()}
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((classroom) => (
          <li key={classroom.id}>
            <ClassroomCard classroom={classroom} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** O cartão da turma: o link cobre o cartão, e o menu fica por cima, no canto. */
function ClassroomCard({
  classroom,
}: Readonly<{
  classroom: AdministratorClassroomPaginateResponse
}>): React.JSX.Element {
  return (
    <Card className="hover:border-primary relative h-full transition-colors">
      <CardHeader>
        <CardTitle className="text-2xl">
          <Link
            to="/administrator/classrooms/$id"
            params={{ id: classroom.id }}
            className="after:absolute after:inset-0"
          >
            {classroom.name}
          </Link>
        </CardTitle>
        <CardDescription>
          {CATEGORY_LABELS[classroom.category]} ·{' '}
          {CATEGORY_SHORT_LABELS[classroom.category]}
        </CardDescription>
        <div className="absolute top-3 right-3 z-dropdown">
          <ClassroomRowActions classroom={classroom} />
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-term-value gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{m.admin_common_advisor()}</dt>
          <dd className="truncate">
            {classroom.advisor?.name ?? m.admin_common_no_advisor()}
          </dd>
          <dt className="text-muted-foreground">
            {m.admin_common_representative()}
          </dt>
          <dd className="truncate">
            {classroom.representative?.name ??
              m.admin_common_no_representative()}
          </dd>
        </dl>
        <p className="text-muted-foreground mt-3 text-sm">
          {m.admin_common_count_students({ count: classroom.studentsCount })} ·{' '}
          {m.admin_common_count_athletes({ count: classroom.athletesCount })} ·{' '}
          {m.admin_common_count_sports({ count: classroom.sportsCount })}
        </p>
      </CardContent>
    </Card>
  )
}
