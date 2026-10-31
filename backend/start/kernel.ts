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
  // Security headers before everything that can refuse: the CORS response,
  // the forbidden-origin one and the 404 also go out with `X-Frame-Options` and HSTS
  // (_standards/backend.md §4.10, "Chain order").
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 */
router.use([
  // First: every error below (origin, authentication, role) already goes out in the
  // language of whoever asked (_standards/i18n.md §3).
  () => import('#middleware/detect-user-locale.middleware'),
  /**
   * Before the bodyparser, on purpose.
   *
   * The barrier decides by method and `Content-Type`, which are headers - it needs
   * no body at all. After the bodyparser, a `multipart` from a forbidden origin would
   * be read in full, written to a temporary disk and only then refused:
   * all the work, for a request that never had permission.
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
