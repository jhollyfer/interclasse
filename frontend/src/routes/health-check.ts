import { createFileRoute } from '@tanstack/react-router'

/**
 * Liveness do frontend: o Nitro está de pé e responde. Não consulta a API - o
 * frontend e o backend sobem e caem sozinhos, e um probe que dependesse do
 * vizinho reiniciaria um app saudável porque o outro caiu.
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
