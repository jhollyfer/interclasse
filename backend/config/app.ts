import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/core/http'

import env from '#start/env'

/**
 * The app URL can be used in various places where you want to create absolute
 * URLs to your application. For example, when sending emails, images should
 * use absolute URLs.
 */
export const serverUrl = env.get('APP_SERVER_URL')

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  /**
   * Generate a unique request id for each incoming request.
   * Useful to correlate logs and debug a request flow.
   */
  generateRequestId: true,

  /**
   * Os proxies cuja palavra sobre o IP do cliente vale (`TRUSTED_PROXIES`).
   * Ausente cai no `loopback` do Adonis. Sem o proxy da produção aqui,
   * `request.ip()` é o IP dele e o limite por IP vira global
   * (_standards/backend.md §4.10; _doc-lib/adonisjs.md#guides/basics/request,
   * https://docs.adonisjs.com/guides/basics/request).
   */
  trustProxy: env.get('TRUSTED_PROXIES'),

  /**
   * Allow HTTP method spoofing via the "_method" form/query parameter.
   * This lets HTML forms target PUT/PATCH/DELETE routes while still
   * submitting with POST.
   */
  allowMethodSpoofing: false,

  /**
   * Desligado: o idioma da requisição chega ao use-case por injeção do `I18n`
   * (`providers/i18n.provider.ts`), a forma que a doc prefere ao async local
   * storage (_doc-lib/adonisjs.md#guides/basics/http-context).
   */
  useAsyncLocalStorage: false,

  /**
   * Redirect configuration controls the behavior of
   * response.redirect().back() and query string forwarding.
   */
  redirect: {
    /**
     * When enabled, all redirects automatically carry over the current
     * request's query string parameters to the redirect destination.
     * Use withQs(false) to opt out for a specific redirect.
     */
    forwardQueryString: true,
  },

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    /**
     * Restrict the cookie to a specific domain.
     * Keep empty to use the current host.
     */
    domain: '',

    /**
     * Restrict the cookie to a URL path. '/' means all routes.
     */
    path: '/',

    /**
     * Default lifetime for cookies managed by the HTTP layer.
     */
    maxAge: '2h',

    /**
     * Prevent JavaScript access to the cookie in the browser.
     */
    httpOnly: true,

    /**
     * Send cookies only over HTTPS in production.
     */
    secure: app.inProduction,

    /**
     * Cross-site policy for cookie sending.
     */
    sameSite: 'lax',
  },
})
