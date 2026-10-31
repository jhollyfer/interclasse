import { createLazyFileRoute } from '@tanstack/react-router'

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
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        {m.advisor_no_class()}
      </p>
    </div>
  )
}
