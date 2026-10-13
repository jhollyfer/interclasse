/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

await import('reflect-metadata')
const { Ignitor, prettyPrintError } = await import('@adonisjs/core')

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = function (filePath: string) {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

try {
  await new Ignitor(APP_ROOT, { importer: IMPORTER })
    .tap(function (app) {
      app.booting(async function () {
        await import('#start/env')
      })
      // O emissor de sinal não aguarda o retorno: `void` diz que o encerramento
      // corre por conta própria, e a falha dele cai no handler do processo.
      app.listen('SIGTERM', function () {
        void app.terminate()
      })
      app.listenIf(app.managedByPm2, 'SIGINT', function () {
        void app.terminate()
      })
    })
    .httpServer()
    .start()
} catch (error) {
  process.exitCode = 1
  await prettyPrintError(error)
}
