import { createLazyFileRoute } from '@tanstack/react-router'

import { EmptyNote } from '#/components/common/empty-note'
import { PageHeader, PageHeaderTitle } from '#/components/common/page-shell'
import { m } from '#/paraglide/messages'

export const Route = createLazyFileRoute('/_private/advisor/')({
  component: NoClassroom,
})

/** An advisor still without a classroom: the organization assigns it. */
function NoClassroom(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>{m.advisor_title()}</PageHeaderTitle>
      </PageHeader>
      <EmptyNote>{m.advisor_no_class()}</EmptyNote>
    </div>
  )
}
