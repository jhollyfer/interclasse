import { createFileRoute } from '@tanstack/react-router'

import { loadClassroomDetail } from '#/components/common/classroom-detail'
import { NotFoundPage } from '#/components/common/not-found-page'

export const Route = createFileRoute('/_private/advisor/$classroomId/')({
  notFoundComponent: () => <NotFoundPage />,
  loader: ({ context, params }) =>
    loadClassroomDetail(context.queryClient, params.classroomId),
})
