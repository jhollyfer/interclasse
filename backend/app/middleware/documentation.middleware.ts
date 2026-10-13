import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import HTTPException from '#exceptions/http.exception'
import { UserRoles } from '#core/entity'

/** Quem opera o painel. */
const STAFF: ReadonlyArray<string> = [UserRoles.ADMINISTRATOR]

/**
 * A referência da API só existe para quem opera a instalação.
 *
 * O documento descreve **toda** a superfície: cada rota, cada parâmetro, cada
 * forma de corpo e cada código de erro. Publicá-lo sem sessão entrega o mapa
 * completo a quem ainda não entrou.
 *
 * **404 e não 403**: um 403 confirmaria que a rota existe e que há um papel que a alcança. Para
 * quem não pode ver, ela simplesmente não está lá.
 *
 * Depende de `silent-auth.middleware`, que já roda antes na pilha do router e
 * popula `auth.user` quando há cookie válido sem recusar quem não tem.
 */
export default class DocumentationMiddleware {
  async handle(context: HttpContext, next: NextFn) {
    const user = context.auth.user

    if (!user) throw HTTPException.NotFound('Não encontrado', 'RESOURCE_NOT_FOUND')

    if (!STAFF.includes(user.role)) {
      throw HTTPException.NotFound('Não encontrado', 'RESOURCE_NOT_FOUND')
    }

    return next()
  }
}
