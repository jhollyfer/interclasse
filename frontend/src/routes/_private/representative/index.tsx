import { createFileRoute } from '@tanstack/react-router'

import { representativeEnrollmentsQueryOptions } from '#/integrations/tanstack-query/queries/representative'

/**
 * Erro engolido (`.catch`): representante sem turma vinculada leva `404`, e a tela
 * explica isso em vez de cair na página de erro.
 */
export const Route = createFileRoute('/_private/representative/')({
  loader: ({ context }) =>
    context.queryClient
      .query(representativeEnrollmentsQueryOptions())
      .catch(() => undefined),
})
