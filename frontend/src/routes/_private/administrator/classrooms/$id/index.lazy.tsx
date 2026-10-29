import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { PencilSimpleIcon } from '@phosphor-icons/react'

import { ClassroomDetail } from '#/components/common/classroom-detail'
import { Button } from '#/components/ui/button'

export const Route = createLazyFileRoute(
  '/_private/administrator/classrooms/$id/',
)({
  component: AdministratorClassroom,
})

function AdministratorClassroom(): React.JSX.Element {
  const { id } = Route.useParams()

  return (
    <ClassroomDetail
      classroomId={id}
      back="/administrator/classrooms"
      actions={
        <Button
          variant="outline"
          render={
            <Link to="/administrator/classrooms/$id/edit" params={{ id }}>
              <PencilSimpleIcon />
              Editar turma
            </Link>
          }
        />
      }
    />
  )
}
