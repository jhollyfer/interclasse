import { indexEntities } from '@adonisjs/core'
import { defineConfig } from '@adonisjs/core/app'
import { generateRegistry } from '@tuyau/core/hooks'
import { indexPolicies } from '@adonisjs/bouncer'

export default defineConfig({
  /*
  |--------------------------------------------------------------------------
  | Experimental flags
  |--------------------------------------------------------------------------
  |
  | The following features will be enabled by default in the next major release
  | of AdonisJS. You can opt into them today to avoid any breaking changes
  | during upgrade.
  |
  */
  experimental: {},

  /*
  |--------------------------------------------------------------------------
  | Commands
  |--------------------------------------------------------------------------
  |
  | List of ace commands to register from packages. The application commands
  | will be scanned automatically from the "./commands" directory.
  |
  */
  commands: [
    () => import('@adonisjs/core/commands'),
    () => import('@adonisjs/lucid/commands'),
    () => import('@adonisjs/session/commands'),
    () => import('@adonisjs/bouncer/commands'),
  ],

  /*
  |--------------------------------------------------------------------------
  | Service providers
  |--------------------------------------------------------------------------
  |
  | List of service providers to import and register when booting the
  | application
  |
  */
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    {
      file: () => import('@adonisjs/core/providers/repl_provider'),
      environment: ['repl', 'test'],
    },
    () => import('@adonisjs/core/providers/vinejs_provider'),
    () => import('@adonisjs/session/session_provider'),
    () => import('@adonisjs/shield/shield_provider'),
    () => import('@adonisjs/lucid/database_provider'),
    () => import('@adonisjs/cors/cors_provider'),
    () => import('@adonisjs/auth/auth_provider'),
    () => import('@adonisjs/drive/drive_provider'),
    () => import('@adonisjs/limiter/limiter_provider'),
    () => import('#providers/storage.provider'),
    () => import('@adonisjs/bouncer/bouncer_provider'),
  ],

  /*
  |--------------------------------------------------------------------------
  | Preloads
  |--------------------------------------------------------------------------
  |
  | List of modules to import before starting the application.
  |
  */
  preloads: [
    () => import('#start/limiter'),
    () => import('#start/routes'),
    () => import('#start/kernel'),
    () => import('#start/validator'),
  ],

  /*
  |--------------------------------------------------------------------------
  | Tests
  |--------------------------------------------------------------------------
  |
  | List of test suites to organize tests by their type. Feel free to remove
  | and add additional suites.
  |
  */
  tests: {
    // Suíte única: sem repositório injetável não há o que dublar num teste
    // unitário. Testar por HTTP exercita rota, middleware, validator, use-case e
    // serialização de uma vez. A spec mora ao lado do que cobre - a da ação na
    // pasta da ação (_standards/backend.md §7); `tests/` guarda só infraestrutura.
    suites: [
      {
        files: ['app/**/*.spec.{ts,js}'],
        name: 'functional',
        timeout: 30000,
      },
    ],
    forceExit: false,
  },

  /*
  |--------------------------------------------------------------------------
  | Metafiles
  |--------------------------------------------------------------------------
  |
  | A collection of files you want to copy to the build folder when creating
  | the production build.
  |
  */
  metaFiles: [
    // `openapi.json` é gerado por `node ace openapi:generate` e servido em
    // `/openapi.json`. Sem esta entrada o build de produção não o copia, e a rota
    // responde 500 no servidor buildado - mas funciona em desenvolvimento.
    { pattern: 'openapi.json', reloadServer: false },
  ],

  hooks: {
    init: [
      indexEntities({
        transformers: { enabled: true },
        controllers: {
          source: 'app/features',
          glob: ['**/*.controller.ts'],
          importAlias: '#features',
        },
      }),
      generateRegistry(),
      // Policies em kebab com sufixo de papel (_standards/architecture.md §3).
      indexPolicies({ glob: ['**/*.policy.ts'] }),
    ],
  },

  directories: {
    httpControllers: 'app/features',
  },
})
