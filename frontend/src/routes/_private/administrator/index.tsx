import { createFileRoute } from '@tanstack/react-router'

import {
  bracketsQueryOptions,
  enrollmentRemovalsQueryOptions,
  matchesQueryOptions,
} from '#/integrations/tanstack-query/queries'

import { PENDING_REMOVALS } from '../-components/menu'

/** As partidas prontas para jogar: os dois times definidos, sem placar. */
export const DASHBOARD_MATCHES = { status: 'SCHEDULED', perPage: 50 }

export const DASHBOARD_BRACKETS = { perPage: 50 }

/** Só a contagem importa no painel: `meta.total` dos avisos sem ciência. */
export const DASHBOARD_REMOVALS = PENDING_REMOVALS

/**
 * O painel da organização: o que tem para fazer hoje - lançar resultado,
 * ler aviso de remoção - e a situação de cada chave.
 */
export const Route = createFileRoute('/_private/administrator/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(matchesQueryOptions(DASHBOARD_MATCHES)),
      context.queryClient.query(bracketsQueryOptions(DASHBOARD_BRACKETS)),
      context.queryClient.query(
        enrollmentRemovalsQueryOptions(DASHBOARD_REMOVALS),
      ),
    ]),
})
