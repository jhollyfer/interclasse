import type { HttpContext } from '@adonisjs/core/http'

/**
 * Container liveness probe: `GET /health-check` (_standards/architecture.md §7).
 *
 * Answers only "the process is up and accepting requests", which is what the
 * orchestrator needs to decide whether to send traffic. No auth, no database and no
 * infrastructure detail: `/health/ready` from `@adonisjs/core/health`
 * reports disk, memory and connections, and its own documentation warns that this
 * response needs a secret header. A probe that demands a secret is one probe
 * fewer. `no-store` so no proxy answers for a process that has already died.
 */
export default class HealthCheckController {
  handle(context: HttpContext) {
    return context.response.header('cache-control', 'no-store').ok({ status: 'ok' })
  }
}
