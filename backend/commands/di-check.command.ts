import { BaseCommand } from '@adonisjs/core/ace'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
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
  static commandName = 'di:check'
  static description = 'Constroi todo service e policy pelo container e reprova o que nao sobe'

  static options: CommandOptions = { startApp: true }

  private async classesDe(diretorio: string, sufixo: string): Promise<string[]> {
    const caminho = join(this.app.appRoot.pathname, 'app', diretorio)

    // Recursivo: service mora em `services/<nome>/<nome>.service.ts`
    // (_padroes/arquitetura.md §3); policy continua plana.
    const entradas = await readdir(caminho, { recursive: true }).catch(() => [])

    return entradas.filter(function (nome) {
      return nome.endsWith(sufixo)
    })
  }

  async run() {
    const alvos: Array<{ diretorio: string; arquivo: string }> = []

    for (const arquivo of await this.classesDe('services', '.service.ts')) {
      alvos.push({ diretorio: 'services', arquivo })
    }

    for (const arquivo of await this.classesDe('policies', '.policy.ts')) {
      alvos.push({ diretorio: 'policies', arquivo })
    }

    const falhas: string[] = []

    for (const alvo of alvos) {
      const especificador = `#${alvo.diretorio}/${alvo.arquivo.replace(/\.ts$/, '')}`

      try {
        const modulo = await import(especificador)
        if (typeof modulo.default !== 'function') continue

        await this.app.container.make(modulo.default)
      } catch (error) {
        let motivo = String(error)
        if (error instanceof Error) motivo = error.message
        falhas.push(`${alvo.diretorio}/${alvo.arquivo}: ${motivo}`)
      }
    }

    if (falhas.length > 0) {
      this.logger.error(`di:check: ${falhas.length} de ${alvos.length} nao sobem pelo container`)
      for (const falha of falhas) this.logger.error(`  ${falha}`)
      this.exitCode = 1
      return
    }

    this.logger.success(`di:check: ${alvos.length} classes construidas pelo container.`)
  }
}
