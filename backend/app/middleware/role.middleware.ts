import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import HTTPException from '#exceptions/http.exception'
import type { UserRole } from '#core/entity'

/**
 * Recusa quem chega a um módulo cujo papel não é o seu.
 *
 * Aplicado no **grupo** de rotas, nunca no endpoint: um endpoint novo nasce
 * protegido pelo módulo em que foi colocado, sem depender de alguém lembrar de
 * anotá-lo.
 *
 * Roda sempre depois de `middleware.auth()`. A ordem importa: sem sessão o papel
 * do requisitante é desconhecido, então a resposta correta é `401`, e é o `auth`
 * que a devolve. O `403` daqui só faz sentido quando já se sabe quem está
 * chamando - diferente do escopo de dados, que responde "não encontrado" para
 * não confirmar a existência do recurso.
 */
export default class RoleMiddleware {
  async handle(context: HttpContext, next: NextFn, roles: ReadonlyArray<UserRole>) {
    const user = context.auth.user

    // `schema.ts` é gerado do banco e tipa `role` como `string`. Alargar a lista
    // para `readonly string[]` é atribuição segura - comparar com `as UserRole`
    // seria mentir para o compilador sobre um valor que vem do banco.
    const allowed: readonly string[] = roles

    if (!user || !allowed.includes(user.role)) {
      throw HTTPException.Forbidden('Acesso negado', 'ACCESS_DENIED')
    }

    return next()
  }
}
