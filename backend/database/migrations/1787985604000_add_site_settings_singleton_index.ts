import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Uma linha só em `site_settings`, garantida pelo banco (_standards/backend.md
 * §4.4): o índice único sobre a expressão constante `(true)` faz toda linha
 * colidir com a outra. Sem ele, duas primeiras leituras simultâneas criavam duas
 * linhas, e a tela passava a mostrar uma ao acaso.
 *
 * Não apaga dado: se a tabela já tiver mais de uma linha, o índice não entra e o
 * `migration:run` falha, para a organização escolher qual manter à mão. Apagar a
 * "sobra" aqui seria contração implícita (§4.13).
 */
export default class extends BaseSchema {
  protected tableName = 'site_settings'

  override async up(): Promise<void> {
    this.schema.raw('CREATE UNIQUE INDEX site_settings_singleton ON site_settings ((true))')
  }

  override async down(): Promise<void> {
    this.schema.raw('DROP INDEX site_settings_singleton')
  }
}
