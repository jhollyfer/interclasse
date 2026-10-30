/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception
 * to a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The server middleware stack runs middleware on all the HTTP
 * requests, even if there is no route registered for
 * the request URL.
 */
server.use([
  () => import('#middleware/force-json-response.middleware'),
  () => import('#middleware/container-bindings.middleware'),
  // Cabeçalhos de segurança antes de tudo que pode recusar: a resposta de CORS,
  // de origem proibida e de 404 também sai com `X-Frame-Options` e HSTS
  // (_standards/backend.md §4.10, "Ordem da cadeia").
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 */
router.use([
  // Primeiro: todo erro abaixo (origem, autenticação, papel) já sai no idioma
  // de quem pediu (_standards/i18n.md §3).
  () => import('#middleware/detect-user-locale.middleware'),
  /**
   * Antes do bodyparser, de propósito.
   *
   * A barreira decide pelo método e pelo `Content-Type`, que são header - não
   * precisa do corpo para nada. Depois do bodyparser, um `multipart` de origem
   * proibida seria lido inteiro, gravado em disco temporário e só então
   * recusado: o trabalho todo, para uma requisição que nunca teve permissão.
   */
  () => import('#middleware/origin.middleware'),
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/silent-auth.middleware'),
  () => import('#middleware/initialize-bouncer.middleware'),
])

/**
 * Named middleware collection must be explicitly assigned to
 * the routes or the routes group.
 */
export const middleware = router.named({
  documentation: () => import('#middleware/documentation.middleware'),
  auth: () => import('#middleware/auth.middleware'),
  role: () => import('#middleware/role.middleware'),
})
