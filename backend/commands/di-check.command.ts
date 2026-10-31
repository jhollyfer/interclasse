import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Builds every service and policy through the container, and fails what does not boot.
 *
 * ESLint's `no-restricted-syntax` already refuses `new Service()` in the code, but it
 * only looks at the call. The remaining defect is on the other side: the class declares
 * a dependency the container cannot resolve, and that only shows up on the first
 * request that uses it - which may be a route nobody exercises in a test. Here all of
 * them are built at once, at boot.
 *
 * The list comes from `readdir`, not written by hand: a manual list is what lets a new
 * service escape the check the day someone forgets to annotate it.
 *
 * It calls no method: building is what we want to prove. A method touches the
 * database, bucket and SMTP, and this command runs in CI, where none of that exists.
 */
export default class DiCheck extends BaseCommand {
  static override commandName = 'di:check'
  static override description =
    'Builds every service and policy through the container and fails whatever does not start'

  static override options: CommandOptions = { startApp: true }

  private async classesIn(directory: string, suffix: string): Promise<string[]> {
    const dirPath = join(this.app.appRoot.pathname, 'app', directory)

    // Recursive: a service lives in `services/<name>/<name>.service.ts`
    // (_standards/architecture.md §3); policy stays flat.
    const entries = await readdir(dirPath, { recursive: true })

    return entries.filter((name) => name.endsWith(suffix))
  }

  override async run() {
    const targets: Array<{ directory: string; file: string }> = []

    for (const file of await this.classesIn('services', '.service.ts')) {
      targets.push({ directory: 'services', file })
    }

    for (const file of await this.classesIn('policies', '.policy.ts')) {
      targets.push({ directory: 'policies', file })
    }

    const failures: string[] = []

    for (const target of targets) {
      const specifier = `#${target.directory}/${target.file.replace(/\.ts$/, '')}`

      try {
        const imported = await import(specifier)
        if (typeof imported.default !== 'function') continue

        await this.app.container.make(imported.default)
      } catch (error) {
        let reason = String(error)
        if (error instanceof Error) reason = error.message
        failures.push(`${target.directory}/${target.file}: ${reason}`)
      }
    }

    if (failures.length > 0) {
      this.logger.error(
        `di:check: ${failures.length} of ${targets.length} do not start through the container`,
      )
      for (const failure of failures) this.logger.error(`  ${failure}`)
      this.exitCode = 1
      return
    }

    this.logger.success(`di:check: ${targets.length} classes built through the container.`)
  }
}
