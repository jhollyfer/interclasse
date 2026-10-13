import { readFile, writeFile } from 'node:fs/promises'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

const OUTPUT = 'openapi.json'

/**
 * Gera `openapi.json` a partir das rotas reais e dos schemas VineJS.
 *
 * O documento é um arquivo commitado, não uma resposta montada na hora: assim
 * ele aparece no diff do PR, o CI consegue recusar um contrato que mudou sem
 * querer, e quem gera cliente tipado não precisa subir o servidor.
 *
 * O `--check` é a única guarda contra a falha silenciosa do gerador: renomear o
 * export de um validator sem mexer no controller não quebra o build - o
 * `loadValidator` engole a falha e a operação perde o payload no documento sem
 * dizer nada. Comparar o documento gerado com o commitado é o que transforma
 * essa perda em build vermelho.
 *
 * `startApp` é obrigatório - sem ele o comando roda sem container, e não há
 * router nem controllers para inspecionar.
 */
export default class OpenapiGenerate extends BaseCommand {
  static override commandName = 'openapi:generate'
  static override description = 'Gera o documento OpenAPI a partir das rotas e dos schemas VineJS'

  static override options: CommandOptions = { startApp: true }

  @flags.boolean({
    description: 'Não escreve nada: compara com o arquivo em disco e falha se divergir',
  })
  declare check: boolean

  @flags.boolean({
    description: 'Trata avisos como erro. Use quando toda rota já tiver `static docs`',
  })
  declare strict: boolean

  override async run() {
    const { buildDocument } = await import('#core/openapi/document')
    const { document, warnings, documented, total } = await buildDocument()

    const serialized = `${JSON.stringify(document, null, 2)}\n`
    const destination = this.app.makePath(OUTPUT)

    for (const warning of warnings) this.logger.warning(warning)

    this.logger.info(`${documented} de ${total} operações com a resposta descrita.`)

    if (this.strict && warnings.length > 0) {
      this.logger.error(`${warnings.length} aviso(s) com --strict. Nada foi escrito.`)
      this.exitCode = 1
      return
    }

    if (this.check) {
      await this.compare(destination, serialized)
      return
    }

    await writeFile(destination, serialized, 'utf-8')
    this.logger.success(`${OUTPUT} escrito com ${Object.keys(document.paths).length} caminhos.`)
  }

  /**
   * Compara sem escrever. É o modo do CI: o build falha quando alguém mexeu numa
   * rota, num validator ou num bloco `docs` e não regerou o documento.
   */
  async compare(destination: string, expected: string) {
    let current

    try {
      current = await readFile(destination, 'utf-8')
    } catch {
      this.logger.error(`${OUTPUT} não existe. Rode \`node ace openapi:generate\`.`)
      this.exitCode = 1
      return
    }

    if (current === expected) {
      this.logger.success(`${OUTPUT} está atualizado.`)
      return
    }

    this.logger.error(
      `${OUTPUT} está desatualizado. Rode \`node ace openapi:generate\` e commite o resultado.`,
    )
    this.exitCode = 1
  }
}
