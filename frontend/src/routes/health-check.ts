import { createFileRoute } from '@tanstack/react-router'

/**
 * The frontend's liveness: Nitro is up and answering. It does not query the API - the
 * frontend and the backend start and stop on their own, and a probe that depended on
 * its neighbor would restart a healthy app because the other one went down.
 */
export const Route = createFileRoute('/health-check')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { status: 'ok' },
          { headers: { 'Cache-Control': 'no-store' } },
        ),
    },
  },
})
