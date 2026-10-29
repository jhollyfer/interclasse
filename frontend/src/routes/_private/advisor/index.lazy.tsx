import { createLazyFileRoute } from '@tanstack/react-router'

import { PageHeader, PageHeaderTitle } from '#/components/common/page-shell'

export const Route = createLazyFileRoute('/_private/advisor/')({
  component: NoClassroom,
})

/** Conselheiro ainda sem turma: quem indica é a organização. */
function NoClassroom(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>Minha turma</PageHeaderTitle>
      </PageHeader>
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        Nenhuma turma vinculada a você. Peça à organização para indicá-lo como
        conselheiro.
      </p>
    </div>
  )
}
