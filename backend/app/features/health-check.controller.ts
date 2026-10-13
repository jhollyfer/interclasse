import type { HttpContext } from '@adonisjs/core/http'

/**
 * Sonda de vida do container: `GET /health-check` (_padroes/arquitetura.md §7).
 *
 * Responde apenas "o processo está de pé e aceitando requisição", que é o que o
 * orquestrador precisa para decidir se manda tráfego. Sem auth, sem banco e sem
 * detalhe de infraestrutura: o `/health/ready` do `@adonisjs/core/health`
 * reporta disco, memória e conexões, e a própria documentação avisa que essa
 * resposta precisa de header secreto. Uma sonda que exige segredo é uma sonda a
 * menos. `no-store` para nenhum proxy responder por um processo que já caiu.
 */
export default class HealthCheckController {
  handle(context: HttpContext) {
    return context.response.header('cache-control', 'no-store').ok({ status: 'ok' })
  }
}
