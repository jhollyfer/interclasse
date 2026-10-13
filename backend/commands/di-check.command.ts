import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Constroi todo service e toda policy pelo container, e reprova o que nao sobe.
 *
 * O `no-restricted-syntax` do ESLint ja recusa `new Serviço()` no codigo, mas
 * ele so olha a chamada. O defeito que sobra e do outro lado: a classe declara
 * uma dependencia que o container nao sabe resolver, e isso so aparece na
 * primeira requisicao que a usa - que pode ser uma rota que ninguem exercita em
 * teste. Aqui todas sao construidas de uma vez, no boot.
 *
 * A lista sai de `readdir`, e nao escrita a mao: e a lista manual que faz
 * servico novo escapar da checagem no dia em que alguem esquece de anota-lo.
 *
 * Nao chama metodo nenhum: construir e o que se quer provar. Metodo toca banco,
 * bucket e SMTP, e este comando roda no CI, onde nada disso existe.
 */
export default class DiCheck extends BaseCommand {
  static override commandName = 'di:check'
  static override description =
    'Constroi todo service e policy pelo container e reprova o que nao sobe'

  static override options: CommandOptions = { startApp: true }

  private async classesIn(directory: string, suffix: string): Promise<string[]> {
    const dirPath = join(this.app.appRoot.pathname, 'app', directory)

    // Recursivo: service mora em `services/<nome>/<nome>.service.ts`
    // (_padroes/arquitetura.md §3); policy continua plana.
    const entries = await readdir(dirPath, { recursive: true }).catch(() => [])

    return entries.filter(function (name) {
      return name.endsWith(suffix)
    })
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
        `di:check: ${failures.length} de ${targets.length} nao sobem pelo container`,
      )
      for (const failure of failures) this.logger.error(`  ${failure}`)
      this.exitCode = 1
      return
    }

    this.logger.success(`di:check: ${targets.length} classes construidas pelo container.`)
  }
}
