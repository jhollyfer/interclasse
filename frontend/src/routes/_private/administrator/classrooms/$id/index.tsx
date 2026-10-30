import { createFileRoute } from '@tanstack/react-router'

import { loadClassroomDetail } from '#/components/common/classroom-detail'

export const Route = createFileRoute('/_private/administrator/classrooms/$id/')(
  {
    loader: ({ context, params }) =>
      loadClassroomDetail(context.queryClient, params.id),
  },
)
