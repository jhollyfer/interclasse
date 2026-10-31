import { createFileRoute } from '@tanstack/react-router'

import {
  bracketsQueryOptions,
  matchesQueryOptions,
} from '#/integrations/tanstack-query/queries/administrator'

import { PENDING_REMOVALS } from '../-components/menu'

/** The matches ready to play: both teams defined, no score. */
export const DASHBOARD_MATCHES = { status: 'SCHEDULED', perPage: 50 }

export const DASHBOARD_BRACKETS = { perPage: 50 }

/** Only the count matters on the dashboard: the `meta.total` of unacknowledged notices. */
export const DASHBOARD_REMOVALS = PENDING_REMOVALS

/**
 * The organization's dashboard: what there is to do today - record a result,
 * read a removal notice - and the state of each bracket.
 *
 * The notice counter stays out of the loader on purpose: it is an extra of the screen, and
 * a failure in it brought the whole dashboard down with a 500. The screen asks for it on its own.
 */
export const Route = createFileRoute('/_private/administrator/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(matchesQueryOptions(DASHBOARD_MATCHES)),
      context.queryClient.query(bracketsQueryOptions(DASHBOARD_BRACKETS)),
    ]),
})
