import { readFile, writeFile } from 'node:fs/promises'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

const OUTPUT = 'openapi.json'

/**
 * Generates `openapi.json` from the real routes and the VineJS schemas.
 *
 * The document is a committed file, not a response built on the fly: this way it
 * shows up in the PR diff, CI can refuse a contract that changed by accident, and
 * whoever generates a typed client does not need to start the server.
 *
 * `--check` is the only guard against the generator's silent failure: renaming a
 * validator export without touching the controller does not break the build - the
 * `loadValidator` swallows the failure and the operation loses its payload in the
 * document without saying anything. Comparing the generated document with the committed
 * one is what turns that loss into a red build.
 *
 * `startApp` is required - without it the command runs with no container, and there
 * is no router or controllers to inspect.
 */
export default class OpenapiGenerate extends BaseCommand {
  static override commandName = 'openapi:generate'
  static override description =
    'Generates the OpenAPI document from the routes and the VineJS schemas'

  static override options: CommandOptions = { startApp: true }

  @flags.boolean({
    description: 'Writes nothing: compares with the file on disk and fails if it differs',
  })
  declare check: boolean

  @flags.boolean({
    description: 'Treats warnings as errors. Use when every route already has `static docs`',
  })
  declare strict: boolean

  override async run() {
    const { buildDocument } = await import('#scripts/openapi/emit')
    const { document, warnings, documented, total } = await buildDocument()

    const serialized = `${JSON.stringify(document, null, 2)}\n`
    const destination = this.app.makePath(OUTPUT)

    for (const warning of warnings) this.logger.warning(warning)

    this.logger.info(`${documented} of ${total} operations with the response described.`)

    if (this.strict && warnings.length > 0) {
      this.logger.error(`${warnings.length} warning(s) with --strict. Nothing was written.`)
      this.exitCode = 1
      return
    }

    if (this.check) {
      await this.compare(destination, serialized)
      return
    }

    await writeFile(destination, serialized, 'utf-8')
    this.logger.success(`${OUTPUT} written with ${Object.keys(document.paths).length} paths.`)
  }

  /**
   * Compares without writing. It is the CI mode: the build fails when someone touched a
   * route, a validator or a `docs` block and did not regenerate the document.
   */
  async compare(destination: string, expected: string) {
    let current

    try {
      current = await readFile(destination, 'utf-8')
    } catch {
      this.logger.error(`${OUTPUT} does not exist. Run \`node ace openapi:generate\`.`)
      this.exitCode = 1
      return
    }

    if (current === expected) {
      this.logger.success(`${OUTPUT} is up to date.`)
      return
    }

    this.logger.error(
      `${OUTPUT} is out of date. Run \`node ace openapi:generate\` and commit the result.`,
    )
    this.exitCode = 1
  }
}
