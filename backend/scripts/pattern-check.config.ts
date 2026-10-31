/**
 * The exceptions and project data that `pattern:check` reads
 * (`_standards/backend.md` §10). Every exception carries the `reason`; an unused exception
 * fails (`_standards/architecture.md` §6).
 */

/** A named `new` exception in a class that is neither a service nor a use case. */
export type NewException = {
  /** The symbol built with `new`. */
  readonly symbol: string
  /** Where the use lives. Accepts `**` and `*`. */
  readonly file: string
  /** Why that `new` is legitimate. */
  readonly reason: string
}

export type PatternCheckConfig = {
  /** Environment key that never goes through `env.get()`, with the reason. §6. */
  readonly envOutsideReader: Readonly<Record<string, string>>
  readonly newAllowlist: ReadonlyArray<NewException>
  readonly softDeleteExempt: ReadonlyArray<string>
  /** SHAPE files: the same API in every project, content per domain. */
  readonly shape: ReadonlyArray<string>
  /**
   * Controllers whose per-record rule is not only ownership: `ctx.bouncer` is
   * mandatory in them (`_standards/backend.md` §4.6).
   */
  readonly BOUNCER_REQUIRED: ReadonlyArray<string>
}

export const CONFIG: PatternCheckConfig = {
  envOutsideReader: {
    NODE_ENV:
      'read as `process.env.NODE_ENV` by the Adonis loader and by `bin/test.ts`, before any env service exists',
    PORT: 'read as `process.env.PORT` by `@adonisjs/core` when starting the HTTP server',
    HOST: 'read as `process.env.HOST` by `@adonisjs/core` when starting the HTTP server',
    TZ: 'read as `process.env.TZ` by Node itself; defines the process time zone',
  },
  newAllowlist: [
    {
      symbol: 'CookieAccessTokensGuard',
      file: 'app/guards/cookie-access-tokens.guard.ts',
      reason: 'factory required by config/auth.ts; receives the request HttpContext',
    },
    {
      symbol: 'SimpleMessagesProvider',
      file: 'app/core/validator.ts',
      reason: 'VineJS API, assigned to vine.messagesProvider at boot',
    },
  ],
  softDeleteExempt: [],
  shape: [
    'app/core/validator.ts',
    'scripts/openapi/field-patches.ts',
    'app/services/storage/storage.service.ts',
    'app/middleware/documentation.middleware.ts',
    'config/openapi.ts',
    'config/logger.ts',
    'config/database.ts',
    'database/schema_rules.ts',
    'start/routes.ts',
    'start/limiter.ts',
    'start/validator.ts',
  ],
  BOUNCER_REQUIRED: [
    'app/features/administrator/users/archive/archive.controller.ts',
    'app/features/administrator/users/delete/delete.controller.ts',
    'app/features/administrator/users/update/update.controller.ts',
    'app/features/storages/files/download/download.controller.ts',
  ],
}
