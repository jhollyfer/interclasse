import { createLazyFileRoute } from '@tanstack/react-router'

import { ClassroomDetail } from '#/components/common/classroom-detail'

export const Route = createLazyFileRoute('/_private/advisor/$classroomId/')({
  component: AdvisorClassroom,
})

function AdvisorClassroom(): React.JSX.Element {
  const { classroomId } = Route.useParams()

  return <ClassroomDetail classroomId={classroomId} />
}
