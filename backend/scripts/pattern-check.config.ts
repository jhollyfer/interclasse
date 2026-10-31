/**
 * As exceções e os dados do projeto que o `pattern:check` lê
 * (`_standards/backend.md` §10). Toda exceção leva o `reason`; exceção sem uso
 * reprova (`_standards/architecture.md` §6).
 */

/** Uma exceção nomeada de `new` em classe que não é service nem use-case. */
export type NewException = {
  /** O símbolo construído com `new`. */
  readonly symbol: string
  /** Onde o uso vive. Aceita `**` e `*`. */
  readonly file: string
  /** Por que aquele `new` é legítimo. */
  readonly reason: string
}

export type PatternCheckConfig = {
  /** Chave de ambiente que nunca passa por `env.get()`, com o reason. §6. */
  readonly envOutsideReader: Readonly<Record<string, string>>
  readonly newAllowlist: ReadonlyArray<NewException>
  readonly softDeleteExempt: ReadonlyArray<string>
  /** Arquivos de FORMA: a mesma API em todo projeto, conteúdo por domínio. */
  readonly shape: ReadonlyArray<string>
  /**
   * Controllers cuja regra por registro não é só posse: o `ctx.bouncer` é
   * obrigatório neles (`_standards/backend.md` §4.6).
   */
  readonly BOUNCER_REQUIRED: ReadonlyArray<string>
}

export const CONFIG: PatternCheckConfig = {
  envOutsideReader: {
    NODE_ENV:
      'lida como `process.env.NODE_ENV` pelo carregador do Adonis e por `bin/test.ts`, antes de existir serviço de env',
    PORT: 'lida como `process.env.PORT` por `@adonisjs/core` ao subir o servidor HTTP',
    HOST: 'lida como `process.env.HOST` por `@adonisjs/core` ao subir o servidor HTTP',
    TZ: 'lida como `process.env.TZ` pelo próprio Node; define o fuso do processo',
  },
  newAllowlist: [
    {
      symbol: 'CookieAccessTokensGuard',
      file: 'app/guards/cookie-access-tokens.guard.ts',
      reason: 'factory exigida por config/auth.ts; recebe o HttpContext da requisição',
    },
    {
      symbol: 'SimpleMessagesProvider',
      file: 'app/core/validator.ts',
      reason: 'API do VineJS, atribuída a vine.messagesProvider no boot',
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
